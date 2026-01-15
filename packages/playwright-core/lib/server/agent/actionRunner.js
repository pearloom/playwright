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
var actionRunner_exports = {};
__export(actionRunner_exports, {
  runAction: () => runAction,
  traceParamsForAction: () => traceParamsForAction
});
module.exports = __toCommonJS(actionRunner_exports);
var import_expectUtils = require("../utils/expectUtils");
var import_time = require("../../utils/isomorphic/time");
var import_crypto = require("../utils/crypto");
var import_ariaSnapshot = require("../../utils/isomorphic/ariaSnapshot");
var import_utilsBundle = require("../../utilsBundle");
var import_errors = require("../errors");
async function runAction(progress, mode, page, action, secrets) {
  const parentMetadata = progress.metadata;
  const frame = page.mainFrame();
  const callMetadata = callMetadataForAction(progress, frame, action);
  callMetadata.log = parentMetadata.log;
  progress.metadata = callMetadata;
  await frame.instrumentation.onBeforeCall(frame, callMetadata, parentMetadata.id);
  let error;
  const result = await innerRunAction(progress, mode, page, action, secrets).catch((e) => error = e);
  callMetadata.endTime = (0, import_time.monotonicTime)();
  callMetadata.error = error ? (0, import_errors.serializeError)(error) : void 0;
  callMetadata.result = error ? void 0 : result;
  await frame.instrumentation.onAfterCall(frame, callMetadata);
  if (error)
    throw error;
  return result;
}
async function innerRunAction(progress, mode, page, action, secrets) {
  const frame = page.mainFrame();
  const commonOptions = { strict: true, noAutoWaiting: mode === "generate" };
  switch (action.method) {
    case "navigate":
      await frame.goto(progress, action.url);
      break;
    case "click":
      await frame.click(progress, action.selector, {
        button: action.button,
        clickCount: action.clickCount,
        modifiers: action.modifiers,
        ...commonOptions
      });
      break;
    case "drag":
      await frame.dragAndDrop(progress, action.sourceSelector, action.targetSelector, { ...commonOptions });
      break;
    case "hover":
      await frame.hover(progress, action.selector, {
        modifiers: action.modifiers,
        ...commonOptions
      });
      break;
    case "selectOption":
      await frame.selectOption(progress, action.selector, [], action.labels.map((a) => ({ label: a })), { ...commonOptions });
      break;
    case "pressKey":
      await page.keyboard.press(progress, action.key);
      break;
    case "pressSequentially": {
      const secret = secrets?.find((s) => s.name === action.text)?.value ?? action.text;
      await frame.type(progress, action.selector, secret, { ...commonOptions });
      if (action.submit)
        await page.keyboard.press(progress, "Enter");
      break;
    }
    case "fill": {
      const secret = secrets?.find((s) => s.name === action.text)?.value ?? action.text;
      await frame.fill(progress, action.selector, secret, { ...commonOptions });
      if (action.submit)
        await page.keyboard.press(progress, "Enter");
      break;
    }
    case "setChecked":
      if (action.checked)
        await frame.check(progress, action.selector, { ...commonOptions });
      else
        await frame.uncheck(progress, action.selector, { ...commonOptions });
      break;
    case "expectVisible": {
      const result = await frame.expect(progress, action.selector, { expression: "to.be.visible", isNot: !!action.isNot });
      if (!result.matches === !action.isNot)
        throw new Error(result.errorMessage);
      break;
    }
    case "expectValue": {
      let result;
      if (action.type === "textbox" || action.type === "combobox" || action.type === "slider") {
        const expectedText = (0, import_expectUtils.serializeExpectedTextValues)([action.value]);
        result = await frame.expect(progress, action.selector, { expression: "to.have.value", expectedText, isNot: !!action.isNot });
      } else if (action.type === "checkbox" || action.type === "radio") {
        const expectedValue = { checked: action.value === "true" };
        result = await frame.expect(progress, action.selector, { selector: action.selector, expression: "to.be.checked", expectedValue, isNot: !!action.isNot });
      } else {
        throw new Error(`Unsupported element type: ${action.type}`);
      }
      if (!result.matches === !action.isNot)
        throw new Error(result.errorMessage);
      break;
    }
    case "expectAria": {
      const expectedValue = (0, import_ariaSnapshot.parseAriaSnapshotUnsafe)(import_utilsBundle.yaml, action.template);
      const result = await frame.expect(progress, "body", { expression: "to.match.aria", expectedValue, isNot: !!action.isNot });
      if (!result.matches === !action.isNot)
        throw new Error(result.errorMessage);
      break;
    }
  }
}
function traceParamsForAction(progress, action) {
  const timeout = progress.timeout;
  switch (action.method) {
    case "navigate": {
      const params = {
        url: action.url,
        timeout
      };
      return { type: "Frame", method: "goto", params };
    }
    case "click": {
      const params = {
        selector: action.selector,
        strict: true,
        modifiers: action.modifiers,
        button: action.button,
        clickCount: action.clickCount,
        timeout
      };
      return { type: "Frame", method: "click", params };
    }
    case "drag": {
      const params = {
        source: action.sourceSelector,
        target: action.targetSelector,
        timeout
      };
      return { type: "Frame", method: "dragAndDrop", params };
    }
    case "hover": {
      const params = {
        selector: action.selector,
        modifiers: action.modifiers,
        timeout
      };
      return { type: "Frame", method: "hover", params };
    }
    case "pressKey": {
      const params = {
        key: action.key
      };
      return { type: "Page", method: "keyboardPress", params };
    }
    case "pressSequentially": {
      const params = {
        selector: action.selector,
        text: action.text,
        timeout
      };
      return { type: "Frame", method: "type", params };
    }
    case "fill": {
      const params = {
        selector: action.selector,
        strict: true,
        value: action.text,
        timeout
      };
      return { type: "Frame", method: "fill", params };
    }
    case "setChecked": {
      if (action.checked) {
        const params = {
          selector: action.selector,
          strict: true,
          timeout
        };
        return { type: "Frame", method: "check", params };
      } else {
        const params = {
          selector: action.selector,
          strict: true,
          timeout
        };
        return { type: "Frame", method: "uncheck", params };
      }
    }
    case "selectOption": {
      const params = {
        selector: action.selector,
        strict: true,
        options: action.labels.map((label) => ({ label })),
        timeout
      };
      return { type: "Frame", method: "selectOption", params };
    }
    case "expectValue": {
      if (action.type === "textbox" || action.type === "combobox" || action.type === "slider") {
        const expectedText = (0, import_expectUtils.serializeExpectedTextValues)([action.value]);
        const params = {
          selector: action.selector,
          expression: "to.have.value",
          expectedText,
          isNot: !!action.isNot,
          timeout: kDefaultTimeout
        };
        return { type: "Frame", method: "expect", title: "Expect Value", params };
      } else if (action.type === "checkbox" || action.type === "radio") {
        const params = {
          selector: action.selector,
          expression: "to.be.checked",
          isNot: !!action.isNot,
          timeout: kDefaultTimeout
        };
        return { type: "Frame", method: "expect", title: "Expect Checked", params };
      } else {
        throw new Error(`Unsupported element type: ${action.type}`);
      }
    }
    case "expectVisible": {
      const params = {
        selector: action.selector,
        expression: "to.be.visible",
        isNot: !!action.isNot,
        timeout: kDefaultTimeout
      };
      return { type: "Frame", method: "expect", title: "Expect Visible", params };
    }
    case "expectAria": {
      const params = {
        selector: "body",
        expression: "to.match.snapshot",
        expectedText: [],
        isNot: !!action.isNot,
        timeout: kDefaultTimeout
      };
      return { type: "Frame", method: "expect", title: "Expect Aria Snapshot", params };
    }
  }
}
function callMetadataForAction(progress, frame, action) {
  const callMetadata = {
    id: `call@${(0, import_crypto.createGuid)()}`,
    objectId: frame.guid,
    pageId: frame._page.guid,
    frameId: frame.guid,
    startTime: (0, import_time.monotonicTime)(),
    endTime: 0,
    log: [],
    ...traceParamsForAction(progress, action)
  };
  return callMetadata;
}
const kDefaultTimeout = 5e3;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  runAction,
  traceParamsForAction
});
