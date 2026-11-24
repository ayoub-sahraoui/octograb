import { browser } from "wxt/browser";
import { defineContentScript } from "wxt/utils/define-content-script";
import type { PageCommand, PageReply, Scope, Values } from "../runtime/model";

export default defineContentScript({
  registration: "runtime",
  main() {
    const state = globalThis as typeof globalThis & {
      octograbPageInstalled?: boolean;
    };
    if (state.octograbPageInstalled) return;
    state.octograbPageInstalled = true;
    const documentId = crypto.randomUUID();
    let cancelPick: (() => void) | undefined;
    function query(root: ParentNode, selector: string) {
      if (!selector.trim()) throw new Error("Choose an element selector.");
      if (selector === ":scope" && root instanceof HTMLElement) return [root];
      try {
        return [...root.querySelectorAll<HTMLElement>(selector)].filter(
          (el) => !el.closest("[data-octograb-picker]"),
        );
      } catch {
        throw new Error(`Invalid CSS selector: ${selector}`);
      }
    }
    function identity(element: HTMLElement) {
      return (
        element.id ||
        element.getAttribute("data-id") ||
        element.getAttribute("href") ||
        element.querySelector("a[href]")?.getAttribute("href") ||
        `${element.tagName}:${element.textContent?.trim().slice(0, 200)}`
      );
    }
    function rootFor(scopes: Scope[] = []): ParentNode {
      let root: ParentNode = document;
      for (const scope of scopes) {
        const element = query(root, scope.selector)[scope.index];
        if (
          !element ||
          (scope.identity && identity(element) !== scope.identity)
        )
          throw new Error(
            "This item changed or disappeared. Edit the selector and start a new run.",
          );
        root = element;
      }
      return root;
    }
    function one(root: ParentNode, selector: string, required = true) {
      const elements = query(root, selector);
      if (elements.length > 1)
        throw new Error(
          `Selector “${selector}” matched ${elements.length} elements. Make it more specific.`,
        );
      if (!elements[0] && required)
        throw new Error(
          `No element matched “${selector}”. Reselect it or add a Wait step.`,
        );
      return elements[0];
    }
    function selectorFor(
      element: HTMLElement,
      root: ParentNode,
      multiple: boolean,
    ) {
      if (element === root) return ":scope";
      const candidates: string[] = [];
      if (element.id && !multiple)
        candidates.push(`#${CSS.escape(element.id)}`);
      for (const attribute of ["data-testid", "data-test", "name", "rel"]) {
        const value = element.getAttribute(attribute);
        if (value)
          candidates.push(
            `${element.localName}[${attribute}="${CSS.escape(value)}"]`,
          );
      }
      const classes = [...element.classList].filter(
        (name) => !/[0-9]{4,}/.test(name),
      );
      if (classes.length) {
        candidates.push(
          element.localName +
            classes.map((name) => `.${CSS.escape(name)}`).join(""),
        );
        candidates.push(...classes.map((name) => `.${CSS.escape(name)}`));
      }
      candidates.push(element.localName);
      let current: HTMLElement | null = element;
      let path = "";
      while (
        current &&
        current !== root &&
        current !== document.documentElement
      ) {
        let part = current.localName;
        if (current.id) part = `#${CSS.escape(current.id)}`;
        else if (current.classList.length)
          part += [...current.classList]
            .map((name) => `.${CSS.escape(name)}`)
            .join("");
        if (!current.id && current.parentElement)
          part += `:nth-child(${[...current.parentElement.children].indexOf(current) + 1})`;
        path = part + (path ? ` > ${path}` : "");
        candidates.push(path);
        current = current.parentElement;
      }
      return (
        candidates.find((candidate) => {
          const matches = query(root, candidate);
          return (
            matches.includes(element) && (multiple || matches.length === 1)
          );
        }) ?? candidates.at(-1)!
      );
    }
    function pick(command: PageCommand): Promise<PageReply> {
      cancelPick?.();
      const root = rootFor(command.scopes);
      return new Promise((resolve) => {
        const host = document.createElement("div");
        host.dataset.octograbPicker = "true";
        host.style.cssText =
          "position:fixed;inset:0;pointer-events:none;z-index:2147483647";
        const shadow = host.attachShadow({ mode: "closed" });
        const box = document.createElement("div");
        box.style.cssText =
          "position:fixed;border:2px solid #14a798;border-radius:4px;background:#14a79820;box-sizing:border-box;pointer-events:none";
        const label = document.createElement("div");
        label.style.cssText =
          "position:fixed;left:16px;right:16px;top:12px;background:#073f43;color:white;border-radius:10px;padding:12px;font:13px/1.5 system-ui;pointer-events:none;box-shadow:0 3px 18px #0003";
        label.textContent =
          "OctoGrab • Hover an element, click to select. ↑ selects its parent. Escape cancels.";
        shadow.append(box, label);
        document.documentElement.append(host);
        let selected: HTMLElement | null = null;
        const highlight = (element: HTMLElement) => {
          selected = element;
          const rect = element.getBoundingClientRect();
          Object.assign(box.style, {
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
          });
          const selector = selectorFor(
            element,
            root,
            Boolean(command.multiple),
          );
          label.textContent = `OctoGrab • ${selector} • ${query(root, selector).length} match(es). Click to select. ↑ parent. Escape cancels.`;
        };
        const move = (event: MouseEvent) => {
          const element =
            event.target instanceof HTMLElement ? event.target : null;
          if (
            element &&
            (root === document ||
              (root instanceof Element && root.contains(element))) &&
            !element.closest("[data-octograb-picker]")
          )
            highlight(element);
        };
        const finish = (cancelled: boolean) => {
          clearTimeout(timer);
          host.remove();
          document.removeEventListener("mousemove", move, true);
          document.removeEventListener("click", click, true);
          document.removeEventListener("keydown", key, true);
          cancelPick = undefined;
          const selector = selected
            ? selectorFor(selected, root, Boolean(command.multiple))
            : "";
          resolve({
            document: documentId,
            url: location.href,
            cancelled,
            selector,
            count: selector ? query(root, selector).length : 0,
            example: selected?.textContent?.trim().slice(0, 160) ?? "",
          });
        };
        const click = (event: MouseEvent) => {
          event.preventDefault();
          event.stopImmediatePropagation();
          if (selected) finish(false);
        };
        const key = (event: KeyboardEvent) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopImmediatePropagation();
            finish(true);
          }
          if (
            event.key === "ArrowUp" &&
            selected?.parentElement &&
            selected.parentElement !== root
          ) {
            event.preventDefault();
            event.stopImmediatePropagation();
            highlight(selected.parentElement);
          }
        };
        const timer = setTimeout(() => finish(true), 120000);
        cancelPick = () => finish(true);
        document.addEventListener("mousemove", move, true);
        document.addEventListener("click", click, true);
        document.addEventListener("keydown", key, true);
      });
    }
    async function execute(command: PageCommand): Promise<PageReply> {
      if (command.action === "cancelPick") {
        cancelPick?.();
        return { document: documentId, url: location.href };
      }
      if (command.action === "pick") return pick(command);
      if (command.document && command.document !== documentId)
        throw new Error(
          "The run page changed unexpectedly. Start a new run after reviewing it.",
        );
      const reply: PageReply = { document: documentId, url: location.href };
      if (command.action === "hello") return reply;
      const root = rootFor(command.scopes);
      if (command.action === "collect") {
        const items = query(root, command.selector!);
        if (items.length > 10000)
          throw new Error(
            "Too many matching elements. Use a narrower item selector.",
          );
        reply.items = items.map((element, index) => ({
          selector: command.selector!,
          index,
          identity: identity(element),
        }));
      } else if (command.action === "condition") {
        const elements = query(root, command.selector!);
        reply.condition =
          command.condition === "Element is missing"
            ? elements.length === 0
            : command.condition === "Element is visible"
              ? elements.some(
                  (el) =>
                    el.getClientRects().length > 0 &&
                    getComputedStyle(el).visibility !== "hidden",
                )
              : elements.length > 0;
      } else if (command.action === "read") {
        const values: Values = {};
        for (const field of command.fields ?? []) {
          const element = one(root, field.selector, field.required !== false);
          let value: string | null = null;
          if (element) {
            if (field.read === "text")
              value = element.textContent?.trim() ?? "";
            else if (field.read === "value") {
              if (!("value" in element))
                throw new Error(`“${field.name}” is not an input.`);
              value = String(element.value);
            } else {
              const attribute = element.getAttribute(field.read);
              if (attribute !== null)
                value = new URL(attribute, document.baseURI).href;
            }
          }
          if (value === null && field.required !== false)
            throw new Error(`Required field “${field.name}” is missing.`);
          Object.defineProperty(values, field.name.trim(), {
            value,
            enumerable: true,
          });
        }
        reply.values = values;
      } else if (command.action === "scroll") {
        const amount =
          (command.direction === "Up" ? -1 : 1) * (command.distance ?? 600);
        if (command.selector)
          one(root, command.selector)!.scrollBy({
            top: amount,
            behavior: "instant",
          });
        else window.scrollBy({ top: amount, behavior: "instant" });
      } else {
        const element = one(root, command.selector!)!;
        if (command.action === "click") {
          if (
            (element as HTMLButtonElement).disabled ||
            element.getAttribute("aria-disabled") === "true"
          )
            throw new Error(
              "The selected button is disabled. Add a Wait step for its enabled selector.",
            );
          const anchor = element.closest("a[href]") as HTMLAnchorElement | null;
          if (anchor) {
            const url = new URL(anchor.href);
            if (
              !["http:", "https:"].includes(url.protocol) ||
              !command.allowedOrigins?.includes(url.origin)
            )
              throw new Error(
                "This link goes outside the websites approved for this run.",
              );
            if (anchor.target && anchor.target !== "_self")
              throw new Error("Use With page for links that open another tab.");
          }
          element.click();
        } else if (command.action === "fill") {
          if (!(
            element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement
          ))
            throw new Error("Fill requires a text input or textarea.");
          if (
            element.disabled ||
            element.readOnly ||
            ["file", "password"].includes(element.type)
          )
            throw new Error("This input cannot be filled by the blueprint.");
          const prototype =
            element instanceof HTMLInputElement
              ? HTMLInputElement.prototype
              : HTMLTextAreaElement.prototype;
          Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(
            element,
            command.value ?? "",
          );
          element.dispatchEvent(new Event("input", { bubbles: true }));
          element.dispatchEvent(new Event("change", { bubbles: true }));
        } else if (command.action === "select") {
          if (!(element instanceof HTMLSelectElement) || element.disabled)
            throw new Error("Choose option requires an enabled native select.");
          if (
            ![...element.options].some(
              (option) => option.value === command.value && !option.disabled,
            )
          )
            throw new Error("The requested option is missing or disabled.");
          element.value = command.value ?? "";
          element.dispatchEvent(new Event("input", { bubbles: true }));
          element.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
      return reply;
    }
    browser.runtime.onMessage.addListener((raw, sender, respond) => {
      if (sender.id !== browser.runtime.id || raw?.type !== "octograb:page")
        return;
      execute(raw.command).then(
        (value) => respond({ ok: true, value }),
        (error) =>
          respond({
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          }),
      );
      return true;
    });
  },
});
