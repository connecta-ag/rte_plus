
// TODO: clean up again - many tags / buttons are just listed for demo / testing purposes

// add custom tag plugin to RTE buttons
RTE.default.showButtons := addToList(deletedtext, insertedtext, editelement, acronym, markchange)
RTE.default.hideButtons := removeFromList(deletedtext, insertedtext, editelement, acronym, markchange)

// allowed/denied tags
RTE.default.proc.allowTags := addToList(del, ins)
RTE.default.proc.denyTags := removeFromList(del, ins)