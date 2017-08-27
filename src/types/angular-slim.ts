// This contains just enough type info for the AngularJS components that we need.

type INgModelController = any; // TODO

type IControl = IFormController | INgModelController;

export interface IFormController {
    $pristine : boolean;
    $dirty : boolean;
    $valid : boolean;
    $invalid : boolean
    $submitted : boolean;
    $pending : {
        [key : string] : Array<IControl>;
    };
    $error : {
        [key : string] : Array<IControl> | undefined;
        email? : Array<IControl>;
        max? : Array<IControl>;
        maxlength? : Array<IControl>;
        min? : Array<IControl>;
        minlength? : Array<IControl>;
        number? : Array<IControl>;
        pattern? : Array<IControl>;
        required? : Array<IControl>;
        url? : Array<IControl>;
        date? : Array<IControl>;
        datetimelocal? : Array<IControl>;
        time? : Array<IControl>;
        week? : Array<IControl>;
        month? : Array<IControl>;
    };

    $rollbackViewValue() : void;
    $commitViewValue() : void;
    $addControl(control : IControl) : void;
    $removeControl(control : IControl) : void;
    $setDirty() : void;
    $setPristine() : void;
    $setUntouched() : void;
    $setSubmitted() : void;
    $setValidity(validationErrorKey : string, isValid : boolean, controller : IControl) : void;
}