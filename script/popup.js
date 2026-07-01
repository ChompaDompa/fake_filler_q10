const statusEl = document.getElementById("status");

function setStatus(message) {
  if (statusEl) {
    statusEl.textContent = message;
  }
}

document.getElementById("btn-fill").addEventListener("click", async () => {
  setStatus("Rellenando formulario...");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      setStatus("No se encontró una pestaña activa.");
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async () => {
        try {
          const remoteUser = await fetchRandomUser();
          const userData = buildUserData(remoteUser);
          autofillDocument(userData);
        } catch (error) {
          console.error("random-filler: unable to populate form", error);
        }

        async function fetchRandomUser() {
          try {
            const response = await fetch("https://randomuser.me/api/?nat=us,gb,ca,au,nz");
            if (!response.ok) {
              throw new Error(`Request failed with status ${response.status}`);
            }
            const payload = await response.json();
            return payload?.results?.[0] ?? null;
          } catch (err) {
            console.warn("random-filler: random user fetch failed", err);
            return null;
          }
        }

        function buildUserData(user) {
          const maleNames = ["Andres", "Camilo", "David", "Julian", "Mateo", "Sebastian", "Juan", "Carlos", "Luis", "Diego"];
          const femaleNames = ["Sofia", "Valentina", "Laura", "Natalia", "Isabella", "Camila", "Daniela", "Maria", "Paula", "Gabriela"];
          const fallbackSurnames = ["Gomez", "Rodriguez", "Lopez", "Martinez", "Garcia", "Ramirez", "Torres", "Hernandez", "Castillo", "Vargas"];

          // Determinar género: usar el de la API si existe; si no, aleatorio para mantener consistencia
          const genderValue = String(user?.gender || "").toLowerCase();
          const hasKnownGender = genderValue === "female" || genderValue === "male";
          const isFemale = hasKnownGender ? genderValue === "female" : Math.random() < 0.5;
          const namePool = isFemale ? femaleNames : maleNames;

          const firstName = formatName(user?.name?.first) || pickRandom(namePool);
          const lastName = formatName(user?.name?.last) || pickRandom(fallbackSurnames);
          const middleName = pickRandom(namePool.filter(name => name !== firstName)) || pickRandom(namePool);
          const secondLastName = pickRandom(fallbackSurnames.filter(name => name !== lastName)) || pickRandom(fallbackSurnames);

          const identification = generateDigits(7, 8);
          const phone = generateDigits(7, 10);
          const cellphone = generateDigits(10, 10);

          const birthDate = generateRandomBirthDate();
          const email = buildEmail(firstName, lastName, identification);
          const address = buildAddress(user);
          const city = formatLocation(user?.location?.city) || "Bogota";
          const state = formatLocation(user?.location?.state) || "Cundinamarca";
          const country = formatLocation(user?.location?.country) || "Colombia";
          const postalCode = sanitizePostalCode(user?.location?.postcode) || generateDigits(5, 6);

          const genderCandidates = isFemale
            ? ["Femenino", "Mujer", "Female", "F", "2"]
            : ["Masculino", "Hombre", "Male", "M", "1"];

          const docTypeCandidates = ["Cedula", "Cedula de ciudadania", "Documento", "Citizen", "1"];
          const fullName = [firstName, middleName, lastName, secondLastName].filter(Boolean).join(" ");

          return {
            firstName,
            middleName,
            lastName,
            secondLastName,
            fullName,
            identification,
            email,
            phone,
            cellphone,
            birthDateDisplay: birthDate.display,
            birthDateISO: birthDate.iso,
            address,
            city,
            state,
            country,
            postalCode,
            genderCandidates,
            docTypeCandidates,
          };

          function pickRandom(list) {
            if (!Array.isArray(list) || list.length === 0) {
              return "";
            }
            return list[Math.floor(Math.random() * list.length)];
          }

          function formatName(value) {
            const cleaned = stripDiacritics(String(value || ""))
              .replace(/[^a-zA-Z\s]/g, " ")
              .replace(/\s+/g, " ")
              .trim();
            return capitalizeWords(cleaned);
          }

          function formatLocation(value) {
            const cleaned = stripDiacritics(String(value || ""))
              .replace(/[^a-zA-Z\s]/g, " ")
              .replace(/\s+/g, " ")
              .trim();
            return capitalizeWords(cleaned);
          }

          function buildEmail(first, last, id) {
            const normalizedFirst = stripDiacritics(first || "").toLowerCase().replace(/[^a-z]/g, "");
            const normalizedLast = stripDiacritics(last || "").toLowerCase().replace(/[^a-z]/g, "");
            const base = [normalizedFirst, normalizedLast].filter(Boolean).join("_") || "user";
            const suffix = String(id || generateDigits(8, 8)).slice(0, 4);
            return `${base}_${suffix}@yopmail.com`;
          }

          function buildAddress(userData) {
            const number = userData?.location?.street?.number;
            const street = stripDiacritics(String(userData?.location?.street?.name || "Principal"))
              .replace(/[^a-zA-Z0-9\s]/g, " ")
              .replace(/\s+/g, " ")
              .trim();
            const numericPart = typeof number === "number" && Number.isFinite(number)
              ? number
              : parseInt(generateDigits(2, 3), 10);
            return `${numericPart} ${street}`.trim();
          }

          function sanitizePostalCode(value) {
            return String(value ?? "")
              .replace(/\D/g, "")
              .slice(0, 10);
          }
        }

        function generateDigits(minLength, maxLength) {
          const target = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
          let result = "";
          for (let i = 0; i < target; i += 1) {
            result += Math.floor(Math.random() * 10);
          }
          if (result.startsWith("0")) {
            result = `1${result.slice(1)}`;
          }
          return result;
        }

        function generateRandomBirthDate() {
          const today = new Date();
          const minYear = today.getFullYear() - 80;
          const maxYear = today.getFullYear() - 18;
          const year = Math.floor(Math.random() * (maxYear - minYear + 1)) + minYear;
          const month = Math.floor(Math.random() * 12);
          const day = Math.floor(Math.random() * 28) + 1;
          const date = new Date(year, month, day);
          const dayStr = String(date.getDate()).padStart(2, "0");
          const monthStr = String(date.getMonth() + 1).padStart(2, "0");
          const iso = date.toISOString().split("T")[0];
          return { display: `${dayStr}/${monthStr}/${year}`, iso };
        }

        function capitalizeWords(value) {
          return value
            .split(" ")
            .filter(Boolean)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(" ");
        }

        function stripDiacritics(value) {
          return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
        }

        function autofillDocument(data) {
          if (!data) {
            return;
          }

          const fieldInfos = collectFieldInfos();
          const filled = new WeakSet();
          const matchers = createMatchers(data);

          for (const matcher of matchers) {
            const matches = findMatches(fieldInfos, matcher, filled);
            if (!matches.length) {
              continue;
            }

            for (const info of matches) {
              const rawValue = typeof matcher.getValue === "function"
                ? matcher.getValue(info.element, data, info)
                : matcher.value;

              const success = applyValue(info.element, rawValue, { allowFallback: matcher.allowFallback });
              if (success) {
                filled.add(info.element);
              }
            }
          }
        }

        function collectFieldInfos() {
          const nodes = Array.from(document.querySelectorAll("input, textarea, select"));
          const infos = [];

          for (const node of nodes) {
            if (!isFillable(node)) {
              continue;
            }
            infos.push({
              element: node,
              texts: collectTexts(node),
            });
          }

          return infos;
        }

        function isFillable(element) {
          if (element.disabled || element.readOnly) {
            return false;
          }
          const tag = element.tagName.toLowerCase();
          if (tag === "input") {
            const type = (element.getAttribute("type") || "text").toLowerCase();
            const invalidTypes = ["button", "submit", "reset", "file", "image", "hidden"];
            if (invalidTypes.includes(type)) {
              return false;
            }
          }
          if (tag === "select") {
            return true;
          }
          return isVisible(element);
        }

        function isVisible(element) {
          const style = window.getComputedStyle(element);
          if (style.visibility === "hidden" || style.display === "none") {
            return false;
          }
          if (element.offsetParent === null && style.position !== "fixed") {
            return false;
          }
          return true;
        }

        function collectTexts(element) {
          const seen = new Set();
          const texts = [];

          const add = (value) => {
            if (!value) {
              return;
            }
            const normalized = normalizeText(value);
            if (!normalized || seen.has(normalized)) {
              return;
            }
            seen.add(normalized);
            texts.push(normalized);
          };

          add(element.getAttribute("placeholder"));
          add(element.getAttribute("aria-label"));
          add(element.getAttribute("title"));
          add(element.dataset?.label);
          add(element.dataset?.placeholder);

          if (element.name) {
            add(element.name.replace(/[\.\-_]+/g, " "));
          }
          if (element.id) {
            add(element.id.replace(/[\.\-_]+/g, " "));
            const escapedId = escapeCssIdentifier(element.id);
            document.querySelectorAll(`label[for="${escapedId}"]`).forEach(label => {
              add(label.textContent);
            });
          }

          let parent = element.parentElement;
          let depth = 0;
          while (parent && depth < 5) {
            if (parent.tagName === "LABEL") {
              add(parent.textContent);
            } else {
              const scopedLabel = parent.querySelector(":scope > label");
              if (scopedLabel) {
                add(scopedLabel.textContent);
              }
            }
            parent = parent.parentElement;
            depth += 1;
          }

          let sibling = element.previousElementSibling;
          let siblingDepth = 0;
          while (sibling && siblingDepth < 3) {
            if (sibling.matches("label, span, strong, b, p, div")) {
              add(sibling.textContent);
            }
            sibling = sibling.previousElementSibling;
            siblingDepth += 1;
          }

          return texts;
        }

        function escapeCssIdentifier(value) {
          if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
            return CSS.escape(value);
          }
          return value.replace(/([\.#[\]+*~,:^$!%&?<>|{}])/g, "\\$1");
        }

        function normalizeText(value) {
          return stripDiacritics(String(value || ""))
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        }

        function createMatchers(data) {
          const matchers = [];

          const addMatcher = (labels, getValue, options = {}) => {
            matchers.push({
              labels,
              termsList: labels.map(label => termsFromLabel(label)),
              getValue,
              fillMultiple: options.fillMultiple ?? false,
              fieldFilter: options.fieldFilter || null,
              excludeTokens: options.exclude ? options.exclude.flatMap(label => termsFromLabel(label)) : null,
              allowFallback: options.allowFallback ?? true,
            });
          };

          const textFieldFilter = (element) => {
            if (element.tagName === "TEXTAREA") {
              return true;
            }
            if (element.tagName !== "INPUT") {
              return false;
            }
            const type = (element.getAttribute("type") || "text").toLowerCase();
            return !["checkbox", "radio"].includes(type);
          };

          addMatcher(["primer nombre", "Nombres", "first name"], () => data.firstName, { fillMultiple: true, fieldFilter: textFieldFilter });
          addMatcher(["segundo nombre", "middle name"], () => data.middleName, { fillMultiple: true, fieldFilter: textFieldFilter });
          addMatcher(["primer apellido", "Apellidos", "first surname", "last name"], () => data.lastName, { fillMultiple: true, fieldFilter: textFieldFilter });
          addMatcher(["segundo apellido", "second surname"], () => data.secondLastName, { fillMultiple: true, fieldFilter: textFieldFilter });
          addMatcher(["nombre completo", "full name"], () => data.fullName, { fillMultiple: true, fieldFilter: textFieldFilter });

          addMatcher([
            "numero identificacion",
            "numero de identificacion",
            "numero documento",
            "numero de documento",
            "documento identidad",
            "identificacion",
            "identificacion solicitante",
          ], () => data.identification, { fillMultiple: true });

          addMatcher(["correo solicitante", "email solicitante"], () => data.email, { fillMultiple: true });
          addMatcher(["correo electronico", "correo electronico", "email"], () => data.email, { fillMultiple: true });

          addMatcher(["telefono celular", "numero celular", "celular", "whatsapp", "mobile"], () => data.cellphone, {
            fillMultiple: true,
            fieldFilter: textFieldFilter,
          });

          addMatcher(["telefono fijo", "telefono residencia", "telefono casa"], () => data.phone, {
            fillMultiple: true,
            fieldFilter: textFieldFilter,
          });

          addMatcher(["telefono", "phone"], () => data.phone, {
            fillMultiple: true,
            fieldFilter: textFieldFilter,
            exclude: ["celular", "mobile", "whatsapp"],
          });

          addMatcher(["fecha nacimiento", "fecha de nacimiento", "birth date", "birthday"], (element) => {
            const type = (element.getAttribute("type") || "").toLowerCase();
            return type === "date" ? data.birthDateISO : data.birthDateDisplay;
          }, { fillMultiple: true });

          addMatcher(["direccion", "direccion", "address"], () => data.address, { fillMultiple: true });
          addMatcher(["pais", "country"], () => data.country, { fillMultiple: true, exclude: ["nacimiento", "birth"] });
          addMatcher(["departamento", "estado", "state"], () => data.state, { fillMultiple: true, exclude: ["nacimiento", "birth"] });
          // addMatcher(["ciudad", "city", "municipio"], () => data.city, { fillMultiple: true, exclude: ["nacimiento", "birth"] });
          addMatcher(["codigo postal", "postal", "zip"], () => data.postalCode, { fillMultiple: true });

          addMatcher(["genero", "sexo", "gender"], () => data.genderCandidates, { fillMultiple: true, allowFallback: false });
          addMatcher(
            ["tipo identificacion", "tipo de identificacion", "document type"],
            () => ({ firstSelectable: true }),
            { fillMultiple: true, allowFallback: false }
          );

          // Lugar de nacimiento / municipio: seleccionar primera sugerencia visible (Selectize/autocomplete)
          addMatcher(
            [
              "lugar de nacimiento",
              "lugar de residencia"
            ],
            () => ({ selectFirstSuggestion: true }),
            { fillMultiple: true, allowFallback: false }
          );

          return matchers;
        }

        function termsFromLabel(label) {
          return normalizeText(label).split(" ").filter(Boolean);
        }

        function findMatches(fieldInfos, matcher, filled) {
          const matches = [];
          const seen = new Set();

          for (const terms of matcher.termsList) {
            const candidates = fieldInfos.filter(info => {
              if (filled.has(info.element) || seen.has(info.element)) {
                return false;
              }
              if (matcher.fieldFilter && !matcher.fieldFilter(info.element)) {
                return false;
              }
              if (matcher.excludeTokens && matcher.excludeTokens.some(token => info.texts.some(text => text.includes(token)))) {
                return false;
              }
              return info.texts.some(text => terms.every(term => text.includes(term)));
            });

            if (!candidates.length) {
              continue;
            }

            if (matcher.fillMultiple) {
              for (const candidate of candidates) {
                if (!seen.has(candidate.element)) {
                  seen.add(candidate.element);
                  matches.push(candidate);
                }
              }
            } else {
              const candidate = candidates[0];
              seen.add(candidate.element);
              matches.push(candidate);
              break;
            }
          }

          return matches;
        }

        function applyValue(element, rawValue, settings = {}) {
          if (rawValue == null) {
            return false;
          }

          if (element.tagName === "SELECT") {
            const success = setSelectValue(element, rawValue, settings);
            if (success) {
              triggerEvents(element);
            }
            return success;
          }

          const type = (element.getAttribute("type") || "").toLowerCase();
          if (type === "radio") {
            return false;
          }

          if (typeof rawValue === "object" && rawValue && rawValue.selectFirstSuggestion) {
            selectFirstSuggestionForInput(element);
            return true;
          }

          if (type === "checkbox") {
            const shouldCheck = Array.isArray(rawValue) ? Boolean(rawValue[0]) : Boolean(rawValue);
            if (element.checked !== shouldCheck) {
              element.checked = shouldCheck;
              triggerEvents(element);
            }
            return true;
          }

          const value = normalizeInputValue(rawValue);
          if (element.value !== value) {
            element.value = value;
            triggerEvents(element);
          }
          return true;
        }

        function normalizeInputValue(rawValue) {
          if (Array.isArray(rawValue)) {
            const stringCandidate = rawValue.find(item => typeof item === "string" && item.trim());
            if (stringCandidate) {
              return stringCandidate;
            }
            return String(rawValue[0] ?? "");
          }
          if (typeof rawValue === "number") {
            return String(rawValue);
          }
          return String(rawValue ?? "");
        }

        function setSelectValue(select, rawValue, { allowFallback = true } = {}) {
          const options = Array.from(select.options);
          if (!options.length) {
            return false;
          }

          const candidates = Array.isArray(rawValue) ? rawValue : [rawValue];

          const getFirstSelectable = () => options.find(option => !option.disabled && option.value !== "");

          for (const candidate of candidates) {
            if (candidate == null) {
              continue;
            }

            if (typeof candidate === "object" && !Array.isArray(candidate)) {
              if (typeof candidate.index === "number") {
                const optionByIndex = options[candidate.index];
                if (optionByIndex && !optionByIndex.disabled) {
                  select.value = optionByIndex.value;
                  return true;
                }
              }

              if (candidate.firstSelectable) {
                const option = getFirstSelectable();
                if (option) {
                  select.value = option.value;
                  return true;
                }
              }

              if (candidate.value != null) {
                const valueString = String(candidate.value);
                const option = options.find(option => option.value === valueString && !option.disabled);
                if (option) {
                  select.value = option.value;
                  return true;
                }
              }

              continue;
            }

            if (typeof candidate === "number") {
              const optionByIndex = options[candidate];
              if (optionByIndex && !optionByIndex.disabled) {
                select.value = optionByIndex.value;
                return true;
              }
              continue;
            }

            const normalizedCandidate = normalizeText(candidate);
            if (!normalizedCandidate) {
              continue;
            }
            const match = options.find(option => {
              const optionText = normalizeText(option.textContent);
              const optionValue = normalizeText(option.value);
              return (optionText && optionText.includes(normalizedCandidate)) || (optionValue && optionValue.includes(normalizedCandidate));
            });
            if (match) {
              select.value = match.value;
              return true;
            }
          }

          if (allowFallback) {
            const fallback = getFirstSelectable() || options.find(option => option.value && !option.disabled);
            if (fallback) {
              select.value = fallback.value;
              return true;
            }
          }

          return false;
        }
        function selectFirstSuggestionForInput(input) {
          if (!input || !(input instanceof HTMLElement)) {
            return;
          }
          try {
            input.focus();
            input.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
            input.click();

            const trySelect = () => {
              const visible = (el) => !!el && (el.offsetParent !== null || window.getComputedStyle(el).position === "fixed");

              let candidate = null;

              // Selectize pattern: first selectable or active item
              const items = Array.from(document.querySelectorAll(
                ".selectize-dropdown-content [data-selectable], .selectize-dropdown-content .active"
              ));
              candidate = items.find(visible) || items[0] || null;

              // Generic autocomplete (role-based)
              if (!candidate) {
                const ariaItems = Array.from(document.querySelectorAll('[role="listbox"] [role="option"]'));
                candidate = ariaItems.find(visible) || ariaItems[0] || null;
              }

              if (candidate) {
                candidate.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
                candidate.click();
                triggerEvents(input);
              }
            };

            setTimeout(trySelect, 60);
          } catch (_) {}
        }
        function triggerEvents(element) {
          element.dispatchEvent(new Event("input", { bubbles: true }));
          element.dispatchEvent(new Event("change", { bubbles: true }));
        }
      },
    });
    setStatus("Formulario rellenado.");
  } catch (error) {
    console.error("random-filler: script injection failed", error);
    setStatus("Error al rellenar el formulario.");
  }
});

document.getElementById("btn-jack").addEventListener("click", async () => {
  const code = generateJackCode();
  setStatus(`Código Jack: ${code}`);
  try {
    await navigator.clipboard.writeText(code);
  } catch (error) {
    console.error("popup: no se pudo copiar el código Jack", error);
  }
});

function generateJackCode() {
  const pad2 = (value) => String(value).padStart(2, "0");
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth() + 1;
  const hour24 = now.getHours();
  const hour12 = hour24 % 12 || 12;

  const dayMonthPart = pad2(day + month);
  const hourPart = pad2(hour12);
  const monthHourPart = pad2(month + hour12);

  return `${dayMonthPart}${hourPart}${monthHourPart}`;
}

const DEFAULT_TEXT_LENGTH = 100;
const textLengthInput = document.getElementById("text-length");

document.getElementById("btn-text").addEventListener("click", async () => {
  const length = getRequestedTextLength();
  const text = generateFillerText(length);
  try {
    await navigator.clipboard.writeText(text);
    setStatus(`Texto de relleno (${text.length} caracteres) copiado al portapapeles.`);
    if (textLengthInput) {
      textLengthInput.value = DEFAULT_TEXT_LENGTH;
    }
  } catch (error) {
    console.error("popup: no se pudo copiar el texto de relleno", error);
    setStatus("Error al copiar el texto de relleno.");
  }
});

function getRequestedTextLength() {
  const parsed = parseInt(textLengthInput?.value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_TEXT_LENGTH;
  }
  return parsed;
}

function generateFillerText(length) {
  const words = [
    "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
    "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
    "magna", "aliqua", "enim", "ad", "minim", "veniam", "quis", "nostrud",
    "exercitation", "ullamco", "laboris", "nisi", "aliquip", "ex", "ea",
    "commodo", "consequat", "duis", "aute", "irure", "in", "reprehenderit",
    "voluptate", "velit", "esse", "cillum", "eu", "fugiat", "nulla", "pariatur",
    "excepteur", "sint", "occaecat", "cupidatat", "non", "proident", "sunt",
    "culpa", "qui", "officia", "deserunt", "mollit", "anim", "id", "est", "laborum",
  ];

  let result = "";
  let index = 0;
  while (result.length < length) {
    result += (result ? " " : "") + words[index % words.length];
    index += 1;
  }
  result = result.slice(0, length);

  return result.charAt(0).toUpperCase() + result.slice(1);
}

document.getElementById("btn-qa").addEventListener("click", () => {
  setStatus("Calculadora QA: próximamente.");
});










