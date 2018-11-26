/**
 * @license
 * Copyright Davinchi. All Rights Reserved.
 */
import {
    $,
    Resource,
    ResourceController,
    EventEmitterFactory,
    ScormService,
    NavigatorService,
    DataOptions,
    ScoFactory
} from "@haztivity/core";
import "jquery-ui-dist/jquery-ui";
import "jq-quiz";
import * as jsscompress from "js-string-compression";
@Resource(
    {
        name: "HzQuiz",
        dependencies: [
            $,
            EventEmitterFactory,
            ScormService,
            NavigatorService,
            DataOptions
        ]
    }
)
export class HzQuizResource extends ResourceController {
    public static readonly NAMESPACE = "hzQuiz";
    public static readonly ON_ANSWER = `${HzQuizResource.NAMESPACE}:answer`;
    public static readonly ON_START = `${HzQuizResource.NAMESPACE}:start`;
    public static readonly ON_STARTED = `${HzQuizResource.NAMESPACE}:started`;
    public static readonly ON_END = `${HzQuizResource.NAMESPACE}:end`;
    protected static readonly PREFIX = "hz-quiz";
    protected static readonly CLASS_COMPONENT = HzQuizResource.PREFIX;
    protected static readonly DEFAULTS_QUIZ = {

    };
    protected static readonly DEFAULTS = {
        storeHighestScore:false,
        attempts:-1,
        onlyMarkAsCompletedOnPass:true,
        setScoreInPage:false,
        saveRuntime:false
    };
    protected _config:any;
    protected _instance:any;
    protected _id:any;
    protected _objectiveIndex;
    protected _availableAttempts;
    protected _currentScore;
    protected _hasScore:boolean = true;
    /**
     * Recurso de cuestionario. Encapsula jquery.quiz
     * @param _$
     * @param _eventEmitterFactory
     * @param _scormService
     * @example
     * div(data-hz-component="HzHeader")
     *      h1(data-hz-header-title)
     */
    constructor(_$: JQueryStatic, _eventEmitterFactory,protected _scormService:ScormService,protected _navigatorService:NavigatorService, protected _dataOptions) {
        super(_$, _eventEmitterFactory);
    }

    init(options, config?) {
        this._options = this._$.extend(true,{},HzQuizResource.DEFAULTS,options);
        this._config = config;
        let quizOptions  = this._dataOptions.getDataOptions(this._$element, "jqQuiz");
        this._options.quiz = this._$.extend(true,{}, HzQuizResource.DEFAULTS_QUIZ, quizOptions);
        this._$element.jqQuiz(quizOptions);
        this._instance = this._$element.jqQuiz("instance");
        this._id = this._instance.getId();
        this._hasScore = this._options.setScoreInPage;
        this._initScorm();
        this._assignEvents();
    }
    startReview(){
        let runtime = this._getData().r;
        if(runtime){
            this._$element.jqQuiz("start",{review:true,runtime:runtime});
        }
    }
    protected _resolveCurrentScore(){
        if(this._currentScore != undefined){
            this._instance._setOption("currentScore",this._currentScore);
            this._instance.redrawProperties();
        }
    }
    protected _initScorm(){
        if(this._scormService.LMSIsInitialized()){
            let objectiveIndex = this._findObjectiveIndex(this._id);
            if(objectiveIndex == -1){
                objectiveIndex = this._registerObjective();
            }
            this._currentScore = this._scormService.doLMSGetValue(`cmi.objectives.${objectiveIndex}.score.raw`);
            this._resolveCurrentScore();
            this._objectiveIndex = objectiveIndex;
            if(this._options.attempts != -1){
                this._availableAttempts = this._getData().a;
                this._resolveAttemptState();
            }
            const cutOffMark = this._$element.jqQuiz("option","cutOffMark");
            if(this._currentScore && cutOffMark){
                if(this._currentScore >= cutOffMark){
                    this._$element.addClass("hz-quiz--pass");
                }else{
                    this._$element.addClass("hz-quiz--fail");
                }
            }
        }else{
            this._availableAttempts = this._options.attempts;
            this._resolveAttemptState();
        }
    }
    protected _resolveAttemptState(){
        if(this._options.attempts != -1){
            if(this._availableAttempts != undefined){
                this._instance._setOption("availableAttempts",this._availableAttempts);
                this._instance.element.attr("data-jq-quiz-available-attempts",this._availableAttempts);
                if(this._availableAttempts != this._options.attempts){
                    this._$element.addClass("hz-quiz--attempted");
                }
                this._instance.redrawProperties();
                if(this._availableAttempts == 0){
                    this._$element.addClass("hz-quiz--no-more-tries");
                    this._instance.disable();
                }
            }
        }
    }
    protected _registerObjective(){
        let objectives = parseInt(this._scormService.doLMSGetValue("cmi.objectives._count")),
            currentObjective = objectives;
        this._scormService.doLMSSetValue(`cmi.objectives.${currentObjective}.id`,this._id);
        this._scormService.doLMSSetValue(`cmi.objectives.${currentObjective}.status`,"not attempted");
        //this._scormService.doLMSSetValue(`cmi.objectives.${currentObjective}.score.max`,this._instance.getMaxPoints());
        this._scormService.doLMSCommit();
        return currentObjective;
    }
    protected _findObjectiveIndex(id){
        let objectives = parseInt(this._scormService.doLMSGetValue("cmi.objectives._count")),
            index = -1;
        for (let objectiveIndex = 0; objectiveIndex < objectives; objectiveIndex++) {
            let objective = "cmi.objectives."+objectiveIndex,
                objectiveId = this._scormService.doLMSGetValue(objective+".id");
            //se busca el objetivo de la actividad actual
            if(objectiveId === id){
                index = objectiveIndex;
                objectiveIndex = objectives;
            }
        }
        return index;
    }
    protected _onStartReview(e){
        e.data.instance.startReview();
    }
    protected _assignEvents(){
        this._$element.off(HzQuizResource.NAMESPACE)
            .on(this._instance.ON_OPTION_CHANGE + "." + HzQuizResource.NAMESPACE,{instance:this},this._onOptionChange)
            .on(this._instance.ON_END + "." + HzQuizResource.NAMESPACE,{instance:this},this._onEnd)
            .on(this._instance.ON_START + "." + HzQuizResource.NAMESPACE,{instance:this},this._onStart)
            .on(this._instance.ON_STARTED + "." + HzQuizResource.NAMESPACE,{instance:this},this._onStarted)
            .on("click."+HzQuizResource.NAMESPACE,"[data-jq-quiz-hz-review]",{instance:this},this._onStartReview);
    }
    protected _onEnd(e,jqQuizInstance,calification,runtime){
        let instance = e.data.instance,
            scoreHighestThanPrevious;
        if(instance._scormService.LMSIsInitialized()){
            let data = instance._getData();
            if(instance._options.storeHighestScore){
                let currentScore = instance._scormService.doLMSGetValue(`cmi.objectives.${instance._objectiveIndex}.score.raw`);
                if(!currentScore || calification.percentage > currentScore){
                    scoreHighestThanPrevious = true;
                    instance._scormService.doLMSSetValue(`cmi.objectives.${instance._objectiveIndex}.score.raw`,calification.percentage);
                    instance._scormService.doLMSSetValue(`cmi.objectives.${instance._objectiveIndex}.status`,calification.success ? "passed" : "failed");
                    if(instance._options.setScoreInPage) {
                        instance._score = calification.percentage;
                    }
                    data.r = runtime;
                }else{
                    scoreHighestThanPrevious = false;
                }
            }else{
                instance._scormService.doLMSSetValue(`cmi.objectives.${instance._objectiveIndex}.score.raw`,calification.percentage);
                instance._scormService.doLMSSetValue(`cmi.objectives.${instance._objectiveIndex}.status`,calification.success ? "passed" : "failed");
                if(instance._options.setScoreInPage) {
                    instance._score = calification.percentage;
                }
                data.r = runtime;
            }
            if(instance._options.saveRuntime) {
                instance._setData(data);
            }
            instance._scormService.doLMSCommit();
            instance._resolveAttemptState();
            calification.scoreHighestThanPrevious = scoreHighestThanPrevious;
        }else if(instance._availableAttempts != undefined){
            instance._resolveAttemptState();
        }
        instance._currentScore = calification.percentage;
        instance._resolveCurrentScore();
        if(calification.success){
            instance._$element.removeClass("hz-quiz--fail");
            instance._$element.addClass("hz-quiz--pass");
        }else{
            instance._$element.removeClass("hz-quiz--pass");
            instance._$element.addClass("hz-quiz--fail");
        }
        if(instance._options.onlyMarkAsCompletedOnPass == false || (instance._options.onlyMarkAsCompletedOnPass == true && calification.success) || (instance._availableAttempts == 0)){
            instance._markAsCompleted();
        }
        instance._eventEmitter.trigger(HzQuizResource.ON_END,[this, calification]);
        instance._eventEmitter.globalEmitter.trigger(HzQuizResource.ON_END,[this, calification]);
    }
    protected _onStart(e,jqQuizInstance){
        let instance = e.data.instance;
        instance._completed = false;
        if(jqQuizInstance._state === jqQuizInstance.STATES.running) {
            if (instance._options.attempts != -1 && instance._availableAttempts > 0) {
                instance._availableAttempts--;
            }
            instance._storeAttempt();
            instance._eventEmitter.trigger(HzQuizResource.ON_START, [this]);
            instance._eventEmitter.globalEmitter.trigger(HzQuizResource.ON_START, [this]);
        }
    }
    protected _onStarted(e,jqQuizInstance){
        let instance = e.data.instance;
        if(jqQuizInstance._state === jqQuizInstance.STATES.running) {
            if (instance._scormService.LMSIsInitialized()) {
                instance._scormService.doLMSSetValue(`cmi.objectives.${instance._objectiveIndex}.status`, "incomplete");
                instance._scormService.doLMSCommit();
            }
            instance._eventEmitter.trigger(HzQuizResource.ON_STARTED, [this]);
            instance._eventEmitter.globalEmitter.trigger(HzQuizResource.ON_STARTED, [this]);
        }
    }
    protected _onOptionChange(e,jqQuizInstance,questionId,optionId){
        let instance:HzQuizResource = e.data.instance;
        instance._eventEmitter.trigger(HzQuizResource.ON_ANSWER,[this, questionId, optionId]);
        instance._eventEmitter.globalEmitter.trigger(HzQuizResource.ON_ANSWER,[this, questionId, optionId]);
    }
    protected _setSuspendData(data){
        let result=false;
        if(this._scormService.LMSIsInitialized()){
            try{
                const parsed = JSON.stringify(data);
                this._scormService.doLMSSetValue(`cmi.suspend_data`, parsed);
                this._scormService.doLMSCommit();
                result = true;
            }catch(e){
                console.error("[HzQuizResource] Failed setting suspend data:",e.message);
            } 
        }
        return result;
    }
    protected _getSuspendData(){
        let result;
        if(this._scormService.LMSIsInitialized()){
            let data = this._scormService.doLMSGetValue(`cmi.suspend_data`);
            if(!!data){
                try {
                    result = JSON.parse(data);
                } catch (e) {
                    result = {};
                    console.error("[HzQuizResource] Failed getting suspend data:",e.message);
                }
            }else{
                result = {};
            }
        }
        return result;
    }
    protected _compressRuntime(runtime){
        let result;
        if(runtime) {
            try {
                result = JSON.stringify(runtime).replace(/"options"/g, '"%o"').replace(/"optionsValues"/g,
                    '"%ov"').replace(/ui-id-/g, '%u').replace(/"isCorrect"/g, '"%c"');
                let hm = new jsscompress.Hauffman();
                result = hm.compress(result);
            } catch (e) {
                result = runtime;
            }
        }
        return result;
    }
    protected _decompressRuntime(runtime){
        let result;
        if(runtime) {
            try {
                let hm = new jsscompress.Hauffman();
                let decompressed = hm.decompress(runtime);
                let str = decompressed.replace(/"%o"/g, '"options"').replace(/"%ov"/g, '"optionsValues"').replace(/%u/g,
                    'ui-id-').replace(/"%c"/g, '"isCorrect"');
                result = JSON.parse(str);
            } catch (e) {
                result = runtime;
            }
        }
        return result;
    }
    protected _setData(data){
        let current = this._getSuspendData();
        let hzq = current.hqz || {};
        let compressed = this._compressRuntime(data.r);
        data.r = compressed;
        hzq[this._id] = data;
        current.hqz = hzq;
        this._setSuspendData(current);
    }
    protected _getData(){
        let current = this._getSuspendData();
        current = current.hqz || {};
        current = current[this._id] || {};
        if(typeof current == "number"){
            current = {a:current};
        }
        current.a = current.a != undefined ? current.a : this._options.attempts;
        current.r = this._decompressRuntime(current.r);
        return current;
    }
    protected _storeAttempt(){
        if(this._options.attempts != -1) {
            if (this._scormService.LMSIsInitialized()) {
                let currentData = this._getData();
                currentData.a = this._availableAttempts;
                this._setData(currentData);
            }
        }
    }
    public disable(){
        if(super.disable()){
            this._$element.jqQuiz("disable");
        }
    }
    public enable(){
        if(!this._scormService.LMSIsInitialized() || this._options.attempts == -1 || this._availableAttempts > 0) {
            if (super.enable()) {
                this._$element.jqQuiz("enable");
            }
        }
    }
    public getInstance(): any {
        return this._instance;
    }
}
