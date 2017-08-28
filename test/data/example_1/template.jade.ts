import {translate} from "./translate";

interface TemplateScope {
    items : Array<{
        name : string;
        values : string[];
    }>;
    someOptionalProperty : undefined | {
        name : string;
    };
}

type FirstSecondThirdPartHtmlScope = any;
