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
    DataOptions
} from "@haztivity/core";
import "jquery-ui-dist/jquery-ui";
import "jq-quiz";
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
        attempts:-1
    };
    protected _config:any;
    protected _instance:any;
    protected _id:any;
    protected _objectiveIndex;
    protected _availableAttempts;
    protected _currentScore;
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
        this._initScorm();
        this._assignEvents();
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
                this._availableAttempts = this._getAvailableAttempts();
                this._resolveAttemptState();
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
                    this._$element.addClass("hz-quiz--failed");
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
    protected _assignEvents(){
        this._$element.off(HzQuizResource.NAMESPACE)
            .on(this._instance.ON_OPTION_CHANGE + "." + HzQuizResource.NAMESPACE,{instance:this},this._onOptionChange)
            .on(this._instance.ON_END + "." + HzQuizResource.NAMESPACE,{instance:this},this._onEnd)
            .on(this._instance.ON_START + "." + HzQuizResource.NAMESPACE,{instance:this},this._onStart)
            .on(this._instance.ON_STARTED + "." + HzQuizResource.NAMESPACE,{instance:this},this._onStarted)
    }
    protected _onEnd(e,jqQuizInstance,calification){
        let instance = e.data.instance;
        if(instance._scormService.LMSIsInitialized() && this._availableAttempts != 0){
            if(instance._options.storeHighestScore){
                let currentScore = instance._scormService.doLMSGetValue(`cmi.objectives.${instance._objectiveIndex}.score.raw`);
                if(calification.percentage > currentScore){
                    instance._scormService.doLMSSetValue(`cmi.objectives.${instance._objectiveIndex}.score.raw`,calification.percentage);
                    instance._scormService.doLMSSetValue(`cmi.objectives.${instance._objectiveIndex}.status`,calification.success ? "passed" : "failed");
                }
            }else{
                instance._scormService.doLMSSetValue(`cmi.objectives.${instance._objectiveIndex}.score.raw`,calification.percentage);
                instance._scormService.doLMSSetValue(`cmi.objectives.${instance._objectiveIndex}.status`,calification.success ? "passed" : "failed");
            }
            instance._scormService.doLMSCommit();
            instance._resolveAttemptState();
        }else if(instance._availableAttempts != undefined){
            instance._resolveAttemptState();
        }
        instance._currentScore = calification.percentage;
        instance._resolveCurrentScore();
        if(calification.success) {
            instance._navigatorService.enable();
            instance._markAsCompleted();
        }
        instance._eventEmitter.trigger(HzQuizResource.ON_END,[this, calification]);
        instance._eventEmitter.globalEmitter.trigger(HzQuizResource.ON_END,[this, calification]);
    }
    protected _onStart(e,jqQuizInstance){
        let instance = e.data.instance;
        instance._navigatorService.disable();
        if(instance._options.attempts != -1 && instance._availableAttempts > 0){
            instance._availableAttempts--;
        }
        instance._storeAttempt();
        instance._eventEmitter.trigger(HzQuizResource.ON_START,[this]);
        instance._eventEmitter.globalEmitter.trigger(HzQuizResource.ON_START,[this]);
    }
    protected _onStarted(e,jqQuizInstance){
        let instance = e.data.instance;
        if(instance._scormService.LMSIsInitialized()){
            instance._scormService.doLMSSetValue(`cmi.objectives.${instance._objectiveIndex}.status`,"incomplete");
            instance._scormService.doLMSCommit();
        }
        instance._eventEmitter.trigger(HzQuizResource.ON_STARTED,[this]);
        instance._eventEmitter.globalEmitter.trigger(HzQuizResource.ON_STARTED,[this]);
    }
    protected _onOptionChange(e,jqQuizInstance,questionId,optionId){
        let instance:HzQuizResource = e.data.instance;
        instance._eventEmitter.trigger(HzQuizResource.ON_ANSWER,[this, questionId, optionId]);
        instance._eventEmitter.globalEmitter.trigger(HzQuizResource.ON_ANSWER,[this, questionId, optionId]);
    }
    protected _setSuspendData(data){
        let result=false;
        if(this._scormService.LMSIsInitialized()){
            try {
                let parsed = "hqz:" + JSON.stringify(data),
                    suspendData = this._scormService.doLMSGetValue(`cmi.suspend_data`),
                    currentQuizData = this._getSuspendData(false);
                if(currentQuizData){
                    suspendData = suspendData.replace(currentQuizData, parsed);
                }else{
                    suspendData+=parsed;
                }
                this._scormService.doLMSSetValue(`cmi.suspend_data`, suspendData);
                this._scormService.doLMSCommit();
                result = true;
            }catch(e){}
        }
        return result;
    }
    protected _getSuspendData(parse){
        let result;
        if(this._scormService.LMSIsInitialized()){
            let data = this._scormService.doLMSGetValue(`cmi.suspend_data`),
                quizData = (data||"").match(/hqz:{(\S|\s)*}/g);
            if(parse != false){
                if(quizData && quizData.length > 0) {
                    try {
                        result = JSON.parse(quizData[0].replace("hqz:", ""));
                    } catch (e) {
                    }
                }else{
                    result = {};
                }
            }else{
                result = quizData;
            }
        }
        return result;
    }
    protected _getAvailableAttempts(){
        let attempts,
            current = this._getSuspendData(true);
        current = current[this._id];
        attempts = current != undefined ? current : this._options.attempts;
        return attempts;
    }
    protected _storeAttempt(){
        if(this._scormService.LMSIsInitialized()){
            let currentData = this._getSuspendData(true);
            currentData[this._id] = this._availableAttempts;
            this._setSuspendData(currentData);
        }
    }
    public disable(){
        if(super.disable()){
            this._$element.jqQuiz("disable");
        }
    }
    public enable(){
        if(this._scormService.LMSIsInitialized() != true || this._options.attempts == -1 || this._availableAttempts > 0) {
            if (super.enable()) {
                this._$element.jqQuiz("enable");
            }
        }
    }
    public getInstance(): any {
        return this._instance;
    }
}
