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
        define(["require", "exports", "@haztivity/core", "jquery-ui-dist/jquery-ui", "jq-quiz", "lz-string"], factory);
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
    var LZString = require("lz-string");
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
            _this._hasScore = true;
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
            this._hasScore = this._options.setScoreInPage;
            this._initScorm();
            this._assignEvents();
            if (this._options.autoComplete) {
                this._markAsCompleted();
            }
        };
        HzQuizResource.prototype.startReview = function () {
            var runtime = this._getData().r;
            if (runtime) {
                this._$element.jqQuiz("start", { revitew: true, runtime: runtime });
            }
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
                    this._availableAttempts = this._getData().a;
                    this._resolveAttemptState();
                }
                var cutOffMark = this._$element.jqQuiz("option", "cutOffMark");
                if (this._currentScore && cutOffMark) {
                    if (this._currentScore >= cutOffMark) {
                        this._$element.addClass("hz-quiz--pass");
                    }
                    else {
                        this._$element.addClass("hz-quiz--fail");
                    }
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
                        this._$element.addClass("hz-quiz--no-more-tries");
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
        HzQuizResource.prototype._onStartReview = function (e) {
            e.preventDefault();
            e.data.instance.startReview();
        };
        HzQuizResource.prototype._assignEvents = function () {
            this._$element.off(HzQuizResource_1.NAMESPACE)
                .on(this._instance.ON_OPTION_CHANGE + "." + HzQuizResource_1.NAMESPACE, { instance: this }, this._onOptionChange)
                .on(this._instance.ON_END + "." + HzQuizResource_1.NAMESPACE, { instance: this }, this._onEnd)
                .on(this._instance.ON_START + "." + HzQuizResource_1.NAMESPACE, { instance: this }, this._onStart)
                .on(this._instance.ON_STARTED + "." + HzQuizResource_1.NAMESPACE, { instance: this }, this._onStarted)
                .on("click." + HzQuizResource_1.NAMESPACE, "[data-jq-quiz-hz-review]", { instance: this }, this._onStartReview);
        };
        HzQuizResource.prototype._onEnd = function (e, jqQuizInstance, calification, runtime) {
            var instance = e.data.instance, scoreHighestThanPrevious;
            if (instance._scormService.LMSIsInitialized()) {
                var data = instance._getData();
                if (instance._options.storeHighestScore) {
                    var currentScore = instance._scormService.doLMSGetValue("cmi.objectives." + instance._objectiveIndex + ".score.raw");
                    if (!currentScore || calification.percentage >= currentScore) {
                        scoreHighestThanPrevious = true;
                        instance._scormService.doLMSSetValue("cmi.objectives." + instance._objectiveIndex + ".score.raw", calification.percentage);
                        instance._scormService.doLMSSetValue("cmi.objectives." + instance._objectiveIndex + ".status", calification.success ? "passed" : "failed");
                        if (instance._options.setScoreInPage) {
                            instance._score = calification.percentage;
                        }
                        data.r = runtime;
                    }
                    else {
                        scoreHighestThanPrevious = false;
                    }
                }
                else {
                    instance._scormService.doLMSSetValue("cmi.objectives." + instance._objectiveIndex + ".score.raw", calification.percentage);
                    instance._scormService.doLMSSetValue("cmi.objectives." + instance._objectiveIndex + ".status", calification.success ? "passed" : "failed");
                    if (instance._options.setScoreInPage) {
                        instance._score = calification.percentage;
                    }
                    data.r = runtime;
                }
                if (instance._options.saveRuntime) {
                    instance._setData(data);
                }
                instance._scormService.doLMSCommit();
                instance._resolveAttemptState();
                calification.scoreHighestThanPrevious = scoreHighestThanPrevious;
            }
            else if (instance._availableAttempts != undefined) {
                instance._resolveAttemptState();
            }
            instance._currentScore = calification.percentage;
            instance._resolveCurrentScore();
            if (calification.success) {
                instance._$element.removeClass("hz-quiz--fail");
                instance._$element.addClass("hz-quiz--pass");
            }
            else {
                instance._$element.removeClass("hz-quiz--pass");
                instance._$element.addClass("hz-quiz--fail");
            }
            if (instance._options.onlyMarkAsCompletedOnPass == false || (instance._options.onlyMarkAsCompletedOnPass == true && calification.success) || (instance._availableAttempts == 0)) {
                instance._markAsCompleted();
            }
            instance._eventEmitter.trigger(HzQuizResource_1.ON_END, [this, calification]);
            instance._eventEmitter.globalEmitter.trigger(HzQuizResource_1.ON_END, [this, calification]);
        };
        HzQuizResource.prototype._onStart = function (e, jqQuizInstance) {
            var instance = e.data.instance;
            instance._completed = false;
            if (jqQuizInstance._state === jqQuizInstance.STATES.running) {
                if (instance._options.attempts != -1 && instance._availableAttempts > 0) {
                    instance._availableAttempts--;
                }
                instance._storeAttempt();
                instance._eventEmitter.trigger(HzQuizResource_1.ON_START, [this]);
                instance._eventEmitter.globalEmitter.trigger(HzQuizResource_1.ON_START, [this]);
            }
        };
        HzQuizResource.prototype._onStarted = function (e, jqQuizInstance) {
            var instance = e.data.instance;
            if (jqQuizInstance._state === jqQuizInstance.STATES.running) {
                if (instance._scormService.LMSIsInitialized()) {
                    instance._scormService.doLMSSetValue("cmi.objectives." + instance._objectiveIndex + ".status", "incomplete");
                    instance._scormService.doLMSCommit();
                }
                instance._eventEmitter.trigger(HzQuizResource_1.ON_STARTED, [this]);
                instance._eventEmitter.globalEmitter.trigger(HzQuizResource_1.ON_STARTED, [this]);
            }
        };
        HzQuizResource.prototype._onOptionChange = function (e, jqQuizInstance, questionId, optionId) {
            var instance = e.data.instance;
            instance._eventEmitter.trigger(HzQuizResource_1.ON_ANSWER, [this, questionId, optionId]);
            instance._eventEmitter.globalEmitter.trigger(HzQuizResource_1.ON_ANSWER, [this, questionId, optionId]);
        };
        HzQuizResource.prototype._setSuspendData = function (data) {
            return this._scormService.setSuspendData(data);
        };
        HzQuizResource.prototype._getSuspendData = function () {
            return this._scormService.getSuspendData();
        };
        HzQuizResource.prototype._compressRuntime = function (runtime) {
            var result;
            if (runtime) {
                try {
                    result = JSON.stringify(runtime).replace(/"options"/g, '"%o"').replace(/"optionsValues"/g, '"%ov"').replace(/ui-id-/g, '%u').replace(/"isCorrect"/g, '"%c"');
                    result = LZString.compress(result);
                }
                catch (e) {
                    result = runtime;
                }
            }
            return result;
        };
        HzQuizResource.prototype._decompressRuntime = function (runtime) {
            var result;
            if (runtime) {
                try {
                    var decompressed = LZString.decompress(runtime);
                    var str = decompressed.replace(/"%o"/g, '"options"').replace(/"%ov"/g, '"optionsValues"').replace(/%u/g, 'ui-id-').replace(/"%c"/g, '"isCorrect"');
                    result = JSON.parse(str);
                }
                catch (e) {
                    result = runtime;
                }
            }
            return result;
        };
        HzQuizResource.prototype._setData = function (data) {
            var current = this._getSuspendData() || {};
            var hzq = current.hqz || {};
            var compressed = this._compressRuntime(data.r);
            data.r = compressed;
            hzq[this._id] = data;
            current.hqz = hzq;
            this._setSuspendData(current);
        };
        HzQuizResource.prototype._getData = function () {
            var current = this._getSuspendData() || {};
            current = current.hqz || {};
            current = current[this._id] || {};
            if (typeof current == "number") {
                current = { a: current };
            }
            current.a = current.a != undefined ? current.a : this._options.attempts;
            current.r = this._decompressRuntime(current.r);
            return current;
        };
        HzQuizResource.prototype._storeAttempt = function () {
            if (this._options.attempts != -1) {
                if (this._scormService.LMSIsInitialized()) {
                    var currentData = this._getData();
                    currentData.a = this._availableAttempts;
                    this._setData(currentData);
                }
            }
        };
        HzQuizResource.prototype.calificate = function (runtime) {
            return this._$element.jqQuiz("calificate", runtime);
        };
        HzQuizResource.prototype.getRuntime = function () {
            return this._getData().r;
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
            attempts: -1,
            onlyMarkAsCompletedOnPass: true,
            setScoreInPage: false,
            saveRuntime: false,
            autoComplete: false
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