
// add our plugin to the RTE buttons list
RTE.default.showButtons := addToList(markchange)
RTE.default.hideButtons := removeFromList(markchange)

// let's make sure RTE will like our <del> and <ins> tags
RTE.default.proc.allowTags := addToList(del, ins)
RTE.default.proc.denyTags := removeFromList(del, ins)

// RTE processing should allow our timestamp attribute
RTE.default.proc.entryHTMLparser_db.tags.del.allowedAttribs := addToList(data-timestamp)
RTE.default.proc.entryHTMLparser_db.tags.ins.allowedAttribs := addToList(data-timestamp)
