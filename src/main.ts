import katex from "katex";
import { addUnitValidator, attachTypingHelper } from "./units.js";
import { Form } from "./form.js";

window.addEventListener("DOMContentLoaded", async () => {
  await renderKatex();
  await initApps();
});

async function renderKatex() {
  for (const katexElem of document.body.querySelectorAll(
    "body script[type=katex]"
  ) as NodeListOf<HTMLScriptElement>) {
    const displayMode = !("inline" in katexElem.dataset);
    const rendered = document.createElement("out");
    try {
      katex.render(katexElem.text, rendered, { displayMode, output: "mathml" });
      rendered.firstElementChild &&
        katexElem.insertAdjacentElement("afterend", rendered.firstElementChild);
    } catch (e) {
      console.error(e);
      rendered.textContent = "KaTeX Error";
      rendered.classList.add("katex-error");
      if (e instanceof Error) {
        rendered.title = e.message;
      }
      katexElem.insertAdjacentElement("afterend", rendered);
    }
    katexElem.remove();
  }
}

function instanceofSome<C extends abstract new (...args: any) => any>(
  obj: object,
  classes: C[]
): obj is InstanceType<C> {
  return classes.some((cls) => obj instanceof cls) as any;
}

async function initApps() {
  const promises: Promise<void>[] = [];
  for (const appElem of document.body.querySelectorAll("[data-app]")) {
    if (!(appElem instanceof HTMLElement)) continue;
    const appName = appElem.dataset.app!;
    if (/[^a-z0-9-]/.test(appName)) continue;

    const forms: Record<string, Form<string>> = {};
    for (const form of appElem.getElementsByTagName("form")) {
      const formElements = assignFormFieldIds(`${appName}.`, form);
      if (form.name) {
        forms[form.name] ??= new Form(formElements);
      }
    }

    promises.push(
      (async () => {
        const appModule = await import(`./app/${appName}`);

        if (appModule.init && appModule.init instanceof Function) {
          appModule.init(appElem, forms);
        }
      })()
    );
  }
  await Promise.all(promises);
}

function assignFormFieldIds(
  prefix: string,
  form: HTMLFormElement
): Record<string, Element> {
  const formElements: Record<string, Element> = {};

  if (form.name && !form.id) {
    form.id = prefix + form.name;
  }

  prefix += form.name + ".";

  for (const elem of form.elements) {
    if (
      instanceofSome(elem, [
        HTMLInputElement,
        HTMLSelectElement,
        HTMLButtonElement,
      ])
    ) {
      let name = elem.name;
      NoName: if (!name) {
        if (elem instanceof HTMLButtonElement && elem.type !== "button") {
          name = elem.type;
          break NoName;
        }

        continue;
      }

      formElements[name] ??= elem;

      if (!elem.id) {
        elem.id = prefix + name;
      }

      const sibling = elem.nextElementSibling;
      if (sibling && sibling instanceof HTMLLabelElement && !sibling.htmlFor) {
        sibling.htmlFor = elem.id;
      }
    }
  }

  return formElements;
}
