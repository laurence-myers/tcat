import {translate} from "./translate";

interface TemplateScope {
    items : Array<{
        name : string;
        values : string[];
    }>;
    someOptionalProperty : undefined | {
        name : string;
    };
    isActive : boolean;
}

interface FooControllerScope {
    fooValue : string;
}

interface BarController {
    barValue : string;
}

interface BarControllerScope extends TemplateScope {

}

type FirstSecondThirdPartHtmlScope = any;
