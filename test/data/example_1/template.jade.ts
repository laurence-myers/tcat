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

interface BarControllerScope {
    barValue : string;
}

type FirstSecondThirdPartHtmlScope = any;
