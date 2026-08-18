import { SelectorData } from "./selector-data";

export class SelectorController {

    selecting: boolean = false;

    constructor() { }

    startSelecting() {
        this.selecting = true;
    }

    stopSelecting() {
        this.selecting = false;
    }
}