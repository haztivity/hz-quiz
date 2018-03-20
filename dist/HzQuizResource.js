var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "@haztivity/core", "jquery-ui-dist/jquery-ui", "jq-quiz"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * @license
     * Copyright Davinchi. All Rights Reserved.
     */
    var core_1 = require("@haztivity/core");
    require("jquery-ui-dist/jquery-ui");
    require("jq-quiz");
    var HzQuizResource = /** @class */ (function (_super) {
        __extends(HzQuizResource, _super);
        /**
         * Recurso de cuestionario. Encapsula jquery.quiz
         * @param _$
         * @param _eventEmitterFactory
         * @param _scormService
         * @example
         * div(data-hz-component="HzHeader")
         *      h1(data-hz-header-title)
         */
        function HzQuizResource(_$, _eventEmitterFactory, _scormService, _navigatorService, _dataOptions) {
            var _this = _super.call(this, _$, _eventEmitterFactory) || this;
            _this._scormService = _scormService;
            _this._navigatorService = _navigatorService;
            _this._dataOptions = _dataOptions;
            return _this;
        }
        HzQuizResource_1 = HzQuizResource;
        HzQuizResource.prototype.init = function (options, config) {
            this._options = this._$.extend(true, {}, HzQuizResource_1.DEFAULTS, options);
            this._config = config;
            var quizOptions = this._dataOptions.getDataOptions(this._$element, "jqQuiz");
            this._options.quiz = this._$.extend(true, {}, HzQuizResource_1.DEFAULTS_QUIZ, quizOptions);
            this._$element.jqQuiz(quizOptions);
            this._instance = this._$element.jqQuiz("instance");
            this._id = this._instance.getId();
            this._initScorm();
            this._assignEvents();
        };
        HzQuizResource.prototype._resolveCurrentScore = function () {
            if (this._currentScore != undefined) {
                this._instance._setOption("currentScore", this._currentScore);
                this._instance.redrawProperties();
            }
        };
        HzQuizResource.prototype._initScorm = function () {
            if (this._scormService.LMSIsInitialized()) {
                var objectiveIndex = this._findObjectiveIndex(this._id);
                if (objectiveIndex == -1) {
                    objectiveIndex = this._registerObjective();
                }
                this._currentScore = this._scormService.doLMSGetValue("cmi.objectives." + objectiveIndex + ".score.raw");
                this._resolveCurrentScore();
                this._objectiveIndex = objectiveIndex;
                if (this._options.attempts != -1) {
                    this._availableAttempts = this._getAvailableAttempts();
                    this._resolveAttemptState();
                }
            }
            else {
                this._availableAttempts = this._options.attempts;
                this._resolveAttemptState();
            }
        };
        HzQuizResource.prototype._resolveAttemptState = function () {
            if (this._options.attempts != -1) {
                if (this._availableAttempts != undefined) {
                    this._instance._setOption("availableAttempts", this._availableAttempts);
                    this._instance.element.attr("data-jq-quiz-available-attempts", this._availableAttempts);
                    if (this._availableAttempts != this._options.attempts) {
                        this._$element.addClass("hz-quiz--attempted");
                    }
                    this._instance.redrawProperties();
                    if (this._availableAttempts == 0) {
                        this._$element.addClass("hz-quiz--failed");
                        this._instance.disable();
                    }
                }
            }
        };
        HzQuizResource.prototype._registerObjective = function () {
            var objectives = parseInt(this._scormService.doLMSGetValue("cmi.objectives._count")), currentObjective = objectives;
            this._scormService.doLMSSetValue("cmi.objectives." + currentObjective + ".id", this._id);
            this._scormService.doLMSSetValue("cmi.objectives." + currentObjective + ".status", "not attempted");
            //this._scormService.doLMSSetValue(`cmi.objectives.${currentObjective}.score.max`,this._instance.getMaxPoints());
            this._scormService.doLMSCommit();
            return currentObjective;
        };
        HzQuizResource.prototype._findObjectiveIndex = function (id) {
            var objectives = parseInt(this._scormService.doLMSGetValue("cmi.objectives._count")), index = -1;
            for (var objectiveIndex = 0; objectiveIndex < objectives; objectiveIndex++) {
                var objective = "cmi.objectives." + objectiveIndex, objectiveId = this._scormService.doLMSGetValue(objective + ".id");
                //se busca el objetivo de la actividad actual
                if (objectiveId === id) {
                    index = objectiveIndex;
                    objectiveIndex = objectives;
                }
            }
            return index;
        };
        HzQuizResource.prototype._assignEvents = function () {
            this._$element.off(HzQuizResource_1.NAMESPACE)
                .on(this._instance.ON_OPTION_CHANGE + "." + HzQuizResource_1.NAMESPACE, { instance: this }, this._onOptionChange)
                .on(this._instance.ON_END + "." + HzQuizResource_1.NAMESPACE, { instance: this }, this._onEnd)
                .on(this._instance.ON_START + "." + HzQuizResource_1.NAMESPACE, { instance: this }, this._onStart)
                .on(this._instance.ON_STARTED + "." + HzQuizResource_1.NAMESPACE, { instance: this }, this._onStarted);
        };
        HzQuizResource.prototype._onEnd = function (e, jqQuizInstance, calification) {
            var instance = e.data.instance;
            if (instance._scormService.LMSIsInitialized() && this._availableAttempts != 0) {
                if (instance._options.storeHighestScore) {
                    var currentScore = instance._scormService.doLMSGetValue("cmi.objectives." + instance._objectiveIndex + ".score.raw");
                    if (calification.percentage > currentScore) {
                        instance._scormService.doLMSSetValue("cmi.objectives." + instance._objectiveIndex + ".score.raw", calification.percentage);
                        instance._scormService.doLMSSetValue("cmi.objectives." + instance._objectiveIndex + ".status", calification.success ? "passed" : "failed");
                    }
                }
                else {
                    instance._scormService.doLMSSetValue("cmi.objectives." + instance._objectiveIndex + ".score.raw", calification.percentage);
                    instance._scormService.doLMSSetValue("cmi.objectives." + instance._objectiveIndex + ".status", calification.success ? "passed" : "failed");
                }
                instance._scormService.doLMSCommit();
                instance._resolveAttemptState();
            }
            else if (instance._availableAttempts != undefined) {
                instance._resolveAttemptState();
            }
            instance._currentScore = calification.percentage;
            instance._resolveCurrentScore();
            if (calification.success) {
                instance._navigatorService.enable();
                instance._markAsCompleted();
            }
            instance._eventEmitter.trigger(HzQuizResource_1.ON_END, [this, calification]);
            instance._eventEmitter.globalEmitter.trigger(HzQuizResource_1.ON_END, [this, calification]);
        };
        HzQuizResource.prototype._onStart = function (e, jqQuizInstance) {
            var instance = e.data.instance;
            instance._navigatorService.disable();
            if (instance._options.attempts != -1 && instance._availableAttempts > 0) {
                instance._availableAttempts--;
            }
            instance._storeAttempt();
            instance._eventEmitter.trigger(HzQuizResource_1.ON_START, [this]);
            instance._eventEmitter.globalEmitter.trigger(HzQuizResource_1.ON_START, [this]);
        };
        HzQuizResource.prototype._onStarted = function (e, jqQuizInstance) {
            var instance = e.data.instance;
            if (instance._scormService.LMSIsInitialized()) {
                instance._scormService.doLMSSetValue("cmi.objectives." + instance._objectiveIndex + ".status", "incomplete");
                instance._scormService.doLMSCommit();
            }
            instance._eventEmitter.trigger(HzQuizResource_1.ON_STARTED, [this]);
            instance._eventEmitter.globalEmitter.trigger(HzQuizResource_1.ON_STARTED, [this]);
        };
        HzQuizResource.prototype._onOptionChange = function (e, jqQuizInstance, questionId, optionId) {
            var instance = e.data.instance;
            instance._eventEmitter.trigger(HzQuizResource_1.ON_ANSWER, [this, questionId, optionId]);
            instance._eventEmitter.globalEmitter.trigger(HzQuizResource_1.ON_ANSWER, [this, questionId, optionId]);
        };
        HzQuizResource.prototype._setSuspendData = function (data) {
            var result = false;
            if (this._scormService.LMSIsInitialized()) {
                var currentData = this._getSuspendData(false);
                currentData.hqz = data;
                try {
                    var parsed = JSON.stringify(currentData);
                    this._scormService.doLMSSetValue("cmi.suspend_data", parsed);
                    this._scormService.doLMSCommit();
                    result = true;
                }
                catch (e) {
                    console.error("[HzQuizResource] Failed setting suspend data:", e.message);
                }
            }
            return result;
        };
        HzQuizResource.prototype._getSuspendData = function (parse) {
            var result;
            if (this._scormService.LMSIsInitialized()) {
                var data = this._scormService.doLMSGetValue("cmi.suspend_data");
                if (!!data) {
                    try {
                        result = JSON.parse(data);
                    }
                    catch (e) {
                        result = {};
                        console.error("[HzQuizResource] Failed getting suspend data:", e.message);
                    }
                }
                else {
                    result = {};
                }
            }
            return result;
        };
        HzQuizResource.prototype._getAvailableAttempts = function () {
            var attempts, current = this._getSuspendData(true);
            current = current.hqz || current;
            current = current[this._id];
            attempts = current != undefined ? current : this._options.attempts;
            return attempts;
        };
        HzQuizResource.prototype._storeAttempt = function () {
            if (this._scormService.LMSIsInitialized()) {
                var currentData = this._getSuspendData(true);
                currentData = currentData.hqz || currentData;
                currentData[this._id] = this._availableAttempts;
                this._setSuspendData(currentData);
            }
        };
        HzQuizResource.prototype.disable = function () {
            if (_super.prototype.disable.call(this)) {
                this._$element.jqQuiz("disable");
            }
        };
        HzQuizResource.prototype.enable = function () {
            if (!this._scormService.LMSIsInitialized() || this._options.attempts == -1 || this._availableAttempts > 0) {
                if (_super.prototype.enable.call(this)) {
                    this._$element.jqQuiz("enable");
                }
            }
        };
        HzQuizResource.prototype.getInstance = function () {
            return this._instance;
        };
        HzQuizResource.NAMESPACE = "hzQuiz";
        HzQuizResource.ON_ANSWER = HzQuizResource_1.NAMESPACE + ":answer";
        HzQuizResource.ON_START = HzQuizResource_1.NAMESPACE + ":start";
        HzQuizResource.ON_STARTED = HzQuizResource_1.NAMESPACE + ":started";
        HzQuizResource.ON_END = HzQuizResource_1.NAMESPACE + ":end";
        HzQuizResource.PREFIX = "hz-quiz";
        HzQuizResource.CLASS_COMPONENT = HzQuizResource_1.PREFIX;
        HzQuizResource.DEFAULTS_QUIZ = {};
        HzQuizResource.DEFAULTS = {
            storeHighestScore: false,
            attempts: -1
        };
        HzQuizResource = HzQuizResource_1 = __decorate([
            core_1.Resource({
                name: "HzQuiz",
                dependencies: [
                    core_1.$,
                    core_1.EventEmitterFactory,
                    core_1.ScormService,
                    core_1.NavigatorService,
                    core_1.DataOptions
                ]
            })
        ], HzQuizResource);
        return HzQuizResource;
        var HzQuizResource_1;
    }(core_1.ResourceController));
    exports.HzQuizResource = HzQuizResource;
});
//# sourceMappingURL=HzQuizResource.js.map