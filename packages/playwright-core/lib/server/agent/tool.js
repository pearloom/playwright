"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var tool_exports = {};
__export(tool_exports, {
  defineTool: () => defineTool,
  toolsForLoop: () => toolsForLoop
});
module.exports = __toCommonJS(tool_exports);
var import_mcpBundle = require("../../mcpBundle");
function defineTool(tool) {
  return tool;
}
function toolsForLoop(progress, context, toolDefinitions, options = {}) {
  const tools = toolDefinitions.map((tool) => {
    const result = {
      name: tool.schema.name,
      description: tool.schema.description,
      inputSchema: (0, import_mcpBundle.zodToJsonSchema)(tool.schema.inputSchema)
    };
    return result;
  });
  if (options.resultSchema) {
    tools.push({
      name: "report_result",
      description: "Report the result of the task.",
      inputSchema: options.resultSchema
    });
  }
  let reportedResult;
  const callTool = async (params) => {
    if (params.name === "report_result") {
      reportedResult = params.arguments;
      return {
        content: [{ type: "text", text: "Done" }],
        isError: false
      };
    }
    const tool = toolDefinitions.find((t) => t.schema.name === params.name);
    if (!tool) {
      return {
        content: [{
          type: "text",
          text: `Tool ${params.name} not found. Available tools: ${toolDefinitions.map((t) => t.schema.name)}`
        }],
        isError: true
      };
    }
    try {
      return await tool.handle(progress, context, params.arguments);
    } catch (error) {
      return {
        content: [{ type: "text", text: error.message }],
        isError: true
      };
    }
  };
  return {
    tools,
    callTool,
    reportedResult: () => reportedResult
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  defineTool,
  toolsForLoop
});
