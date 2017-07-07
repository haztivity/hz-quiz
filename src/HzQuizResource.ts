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
    protected static readonly DEFAULT_QUESTIONNAIRE = {

    };
    protected static readonly _DEFAULTS = {
    };
    protected _config:any;
    protected _instance:any;
    protected _id:any;
    protected _objectiveIndex;
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
        this._options = options;
        this._config = config;
        let questionnaireOptions = this._dataOptions.getDataOptions(this._$element, "jqQuiz");
        this._options.quiz = this._$.extend(true,{}, HzQuizResource.DEFAULT_QUESTIONNAIRE, questionnaireOptions);
        this._$element.jqQuiz(questionnaireOptions);
        this._instance = this._$element.jqQuiz("instance");
        this._id = this._instance.getId();
        this._initScorm();
        this._assignEvents();
    }
    protected _initScorm(){
        this._scormService.doLMSInitialize();
        if(this._scormService.LMSIsInitialized()){
            let objectiveIndex = this._findObjectiveIndex(this._id);
            if(objectiveIndex == -1){
                objectiveIndex = this._registerObjective();
            }
            this._objectiveIndex = objectiveIndex;
        }
    }
    protected _registerObjective(){
        let objectives = parseInt(this._scormService.doLMSGetValue("cmi.objectives._count")),
            currentObjective = objectives;
        this._scormService.doLMSSetValue(`cmi.objectives.${currentObjective}.id`,this._id);
        this._scormService.doLMSSetValue(`cmi.objectives.${currentObjective}.status`,"not attempted");
        this._scormService.doLMSSetValue(`cmi.objectives.${currentObjective}.score.max`,this._instance.getMaxPoints());
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
        if(instance._scormService.LMSIsInitialized()){
            instance._scormService.doLMSSetValue(`cmi.objectives.${instance._objectiveIndex}.score.raw`,calification.score);
            instance._scormService.doLMSSetValue(`cmi.objectives.${instance._objectiveIndex}.status`,calification.success ? "passed" : "failed");
            instance._scormService.doLMSCommit();
        }
        instance._navigatorService.enable();
        instance._markAsCompleted();
        instance._eventEmitter.trigger(HzQuizResource.ON_END,[this, calification]);
        instance._eventEmitter.globalEmitter.trigger(HzQuizResource.ON_END,[this, calification]);
    }
    protected _onStart(e,jqQuizInstance){
        let instance = e.data.instance;
        instance._navigatorService.disable();
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
    public disable(){
        if(super.disable()){
            this._$element.jqQuiz("option","disabled",true);
        }
    }
    public enable(){
        if(super.enable()){
            this._$element.jqQuiz("option","disabled",false);
        }
    }
    public getInstance(): any {
        return this._instance;
    }
}
