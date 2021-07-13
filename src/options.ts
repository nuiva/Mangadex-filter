import { GMOption, JsonSetWrapper, ArrayWrapper, ObjectField } from "../storage/src/storage";

let options = new GMOption("__OPTIONS");

export let FILTERED_LANGS = new JsonSetWrapper(
    new ArrayWrapper(
        new ObjectField(
            options, "FILTERED_LANGS"
        )
    )
);

export let FILTERING_TAG_WEIGHTS = new ArrayWrapper(new ObjectField(options, "FILTERING_TAG_WEIGHTS"));
