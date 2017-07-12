# hz-quiz
hz-quiz is an haztivity resource to create quiz.\
hz-quiz uses [jqQuiz](https://github.com/davinchi-finsi/jq-quiz) under the hood.
## Install
### NPM
```npm i --save @haztivity/hz-quiz```
## Dependencies
- JQuery
- jqQuiz
- @haztivity/core
## Usage
1. Import @haztivity/hz-quiz
2. Add HzQuizResource to the page
3. Create the quiz structure with HTML or Pug
4. Set ```data-hz-resource="HzQuiz"```
### Ts
```typescript
import {PageFactory, Page, PageController, PageRegister} from "@haztivity/core";
import template from "./page.pug";
import {HzQuizResource} from "@haztivity/hz-quiz";
export let page: PageRegister = PageFactory.createPage(
    {
        name: "myPage",
        resources: [
            HzQuizResource
        ],
        template: template
    }
);
```
### Pug
```pug
include node_modules/jqQuiz/dist/jq-quiz
+jq-quiz({
    id:"myQuiz",
    attributes:{
        "data-hz-resource":"HzQuiz"
    },
    header:{
        title:"My quiz", //title for the quiz
        description:"Description for my quiz", //a description for the student
        actions:[ //actions when the quiz has not been started
            {
                type:"start", //the type of the action, for more info please go to the actions section
                content:"Start the quiz" // The content for the button
            }
        ]
    },
    body:{
        //the questions
        questions:[
            {
                content:"Some question",
                options:[
                    {
                        name:"q1",//all the options of the same question must has the same name
                        content:"Incorrect",//text for the option
                        isCorrect:false //set if is the correct option
                    },
                    {
                        name:"q1",
                        content:"Correct",
                        isCorrect:true
                    }
                ]
            }
        ],
        //available actions during the quiz.
        actions:[
            {
                type:"end", //the type of the action, for more info please go to the actions section
                content:"End the quiz" // The content for the button
            }
        ]
    },
    //jquery ui dialog result
    result:{
        items: [
            {
                type: "success ? Perfect! : Ohhh, try again"
            }
        ]
    }
})

```
or
### HTML
```html
<section class="jq-quiz" id="myQuiz">
    <form class="jq-quiz__form" data-jq-quiz-wrapper="data-jq-quiz-wrapper">
        <header class="jq-quiz__header" data-jq-quiz-header>
            <!--Quiz title-->
            <h1 class="jq-quiz__title" data-jq-quiz-title>My quiz title</h1>
            <!--End quiz title-->
            <!--Questionnaire description-->
            <p class="jq-quiz__description" data-jq-quiz-description>Description for my quiz</p>
            <!--End quiz description-->
            <!--Quiz actions-->
            <div class="jq-quiz__actions" data-jq-quiz-actions>
                <!--Quiz actions-->
                <button class="jq-quiz__action" data-jq-quiz-start>Start the quiz</button>
                <!--End quiz actions-->
            </div>
            <!--End quiz actions-->
        </header>
        <!--Quiz body-->
        <div class="jq-quiz__body" data-jq-quiz-body>
            <!--Quiz questions-->
            <div class="jq-quiz__questions" data-jq-quiz-questions>
                <!--Quiz question-->
                <fieldset class="jq-quiz__question" data-jq-quiz-question>
                    <!--Quiz statement-->
                    <legend class="jq-quiz__statement" data-jq-quiz-statement>Some question</legend>
                    <!--End quiz statement-->
                    <!--Quiz options-->
                    <div class="jq-quiz__options" data-jq-quiz-options>
                        <!--Quiz option-->
                        <div class="jq-quiz__option" data-jq-quiz-option>
                            <label class="jq-quiz__option-label">
                                <span>Incorrect</span>
                                <input class="jq-quiz__option-field" type="radio" name="q1">
                            </label>
                        </div>
                        <!--End quiz option-->
                        <!--Quiz option-->
                        <div class="jq-quiz__option" data-jq-quiz-option data-is-correct="true">
                            <label class="jq-quiz__option-label">
                                <span>Correct</span>
                                <input class="jq-quiz__option-field" type="radio" name="q1">
                            </label>
                        </div>
                        <!--End quiz option-->
                    </div>
                    <!--End quiz options-->
                </fieldset>
                <!--End quiz question-->
            </div>
            <!--End quiz questions-->
            <!--Quiz actions-->
            <div class="jq-quiz__actions" data-jq-quiz-actions>
                <!--Quiz actions-->
                <button class="jq-quiz__action" data-jq-quiz-end>End the quiz</button>
                <!--End quiz actions-->
            </div>
            <!--End quiz actions-->
        </div>
        <!--End quiz body-->
        <!--Questionnaire result-->
        <div class="jq-quiz__result" data-jq-quiz-result>
            <!--Questionnaire body-->
            <div class="jq-quiz__result-item" data-jq-quiz-result-item="success ? Perfect! : Ohhh, try again"></div>
            <!--End quiz body-->
        </div>
        <!--End quiz result-->
    </form>
</section>
```
## Options
### jqQuiz options
All the options of jqQuiz quiz **except** functions could be specified by attributes using:
```pug
    data-opt-jq-quiz-[option]=[value]
```
If the option have multiple words, use dashes, for example ```pointsForSuccess``` have to be provided as ```points-for-success```\
For more info please visit [jqQuiz](https://github.com/davinchi-finsi/jq-quiz)

### HzQuiz options
HzQuiz provides specific options for the integration quiz haztivity.

| Option            | Default | Description |
| ----------------- | ------- | ----------- |
| attempts          | -1      | Number of available attempts. When reach 0, the quiz will be blocked. Set -1 for unlimited attempts.|
| storeHighestScore | false   | If true, the score is stored when is higher than the score of the last attempt. If false, the new score will be stored. |
