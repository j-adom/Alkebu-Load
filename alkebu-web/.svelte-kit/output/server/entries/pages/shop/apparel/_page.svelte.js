import { t as sanitize_slots, c as attr_class, i as attr_style, b as slot, g as ensure_array_like, j as attributes, p as bind_props, d as attr, e as stringify, f as store_get, u as unsubscribe_stores } from "../../../../chunks/index2.js";
import { A as ApparelCard } from "../../../../chunks/ApparelCard.js";
import { o as onDestroy, t as tick, c as createEventDispatcher } from "../../../../chunks/index-server.js";
import { computePosition, autoUpdate, offset, flip, shift } from "@floating-ui/dom";
import "clsx";
import { a1 as fallback, e as escape_html } from "../../../../chunks/utils2.js";
import { p as page } from "../../../../chunks/stores.js";
import { g as goto } from "../../../../chunks/client.js";
import { F as FeaturedBar } from "../../../../chunks/FeaturedBar.js";
import { S as Search } from "../../../../chunks/search.js";
import { M as Meta } from "../../../../chunks/Meta.js";
function createFloatingActions(initOptions) {
  let referenceElement;
  let floatingElement;
  const defaultOptions = {
    autoUpdate: true
  };
  let options = initOptions;
  const getOptions = (mixin) => {
    return { ...defaultOptions, ...initOptions || {}, ...mixin || {} };
  };
  const updatePosition = (updateOptions) => {
    if (referenceElement && floatingElement) {
      options = getOptions(updateOptions);
      computePosition(referenceElement, floatingElement, options).then((v) => {
        Object.assign(floatingElement.style, {
          position: v.strategy,
          left: `${v.x}px`,
          top: `${v.y}px`
        });
        options?.onComputed && options.onComputed(v);
      });
    }
  };
  const referenceAction = (node) => {
    if ("subscribe" in node) {
      setupVirtualElementObserver(node);
      return {};
    } else {
      referenceElement = node;
      updatePosition();
    }
  };
  const contentAction = (node, contentOptions) => {
    let autoUpdateDestroy;
    floatingElement = node;
    options = getOptions(contentOptions);
    setTimeout(() => updatePosition(contentOptions), 0);
    updatePosition(contentOptions);
    const destroyAutoUpdate = () => {
      if (autoUpdateDestroy) {
        autoUpdateDestroy();
        autoUpdateDestroy = void 0;
      }
    };
    const initAutoUpdate = ({ autoUpdate: autoUpdate$1 } = options || {}) => {
      destroyAutoUpdate();
      if (autoUpdate$1 !== false) {
        tick().then(() => {
          return autoUpdate(referenceElement, floatingElement, () => updatePosition(options), autoUpdate$1 === true ? {} : autoUpdate$1);
        });
      }
      return;
    };
    autoUpdateDestroy = initAutoUpdate();
    return {
      update(contentOptions2) {
        updatePosition(contentOptions2);
        autoUpdateDestroy = initAutoUpdate(contentOptions2);
      },
      destroy() {
        destroyAutoUpdate();
      }
    };
  };
  const setupVirtualElementObserver = (node) => {
    const unsubscribe = node.subscribe(($node) => {
      if (referenceElement === void 0) {
        referenceElement = $node;
        updatePosition();
      } else {
        Object.assign(referenceElement, $node);
        updatePosition();
      }
    });
    onDestroy(unsubscribe);
  };
  return [
    referenceAction,
    contentAction,
    updatePosition
  ];
}
function filter({
  loadOptions,
  filterText,
  items,
  multiple,
  value,
  itemId,
  groupBy,
  filterSelectedItems,
  itemFilter,
  convertStringItemsToObjects,
  filterGroupedItems,
  label
}) {
  if (items && loadOptions) return items;
  if (!items) return [];
  if (items && items.length > 0 && typeof items[0] !== "object") {
    items = convertStringItemsToObjects(items);
  }
  let filterResults = items.filter((item) => {
    let matchesFilter = itemFilter(item[label], filterText, item);
    if (matchesFilter && multiple && value?.length) {
      matchesFilter = !value.some((x) => {
        return filterSelectedItems ? x[itemId] === item[itemId] : false;
      });
    }
    return matchesFilter;
  });
  if (groupBy) {
    filterResults = filterGroupedItems(filterResults);
  }
  return filterResults;
}
async function getItems({ dispatch, loadOptions, convertStringItemsToObjects, filterText }) {
  let res = await loadOptions(filterText).catch((err) => {
    console.warn("svelte-select loadOptions error :>> ", err);
    dispatch("error", { type: "loadOptions", details: err });
  });
  if (res && !res.cancelled) {
    if (res) {
      if (res && res.length > 0 && typeof res[0] !== "object") {
        res = convertStringItemsToObjects(res);
      }
      dispatch("loaded", { items: res });
    } else {
      res = [];
    }
    return {
      filteredItems: res,
      loading: false,
      focused: true,
      listOpen: true
    };
  }
}
function ChevronIcon($$renderer) {
  $$renderer.push(`<svg width="100%" height="100%" viewBox="0 0 20 20" focusable="false" aria-hidden="true" class="svelte-1kxu7be"><path fill="currentColor" d="M4.516 7.548c0.436-0.446 1.043-0.481 1.576 0l3.908 3.747
          3.908-3.747c0.533-0.481 1.141-0.446 1.574 0 0.436 0.445 0.408 1.197 0
          1.615-0.406 0.418-4.695 4.502-4.695 4.502-0.217 0.223-0.502
          0.335-0.787 0.335s-0.57-0.112-0.789-0.335c0
          0-4.287-4.084-4.695-4.502s-0.436-1.17 0-1.615z"></path></svg>`);
}
function ClearIcon($$renderer) {
  $$renderer.push(`<svg width="100%" height="100%" viewBox="-2 -2 50 50" focusable="false" aria-hidden="true" role="presentation" class="svelte-1hraxrc"><path fill="currentColor" d="M34.923,37.251L24,26.328L13.077,37.251L9.436,33.61l10.923-10.923L9.436,11.765l3.641-3.641L24,19.047L34.923,8.124
    l3.641,3.641L27.641,22.688L38.564,33.61L34.923,37.251z"></path></svg>`);
}
function LoadingIcon($$renderer) {
  $$renderer.push(`<svg class="loading svelte-y9fi5p" viewBox="25 25 50 50"><circle class="circle_path svelte-y9fi5p" cx="50" cy="50" r="20" fill="none" stroke="currentColor" stroke-width="5" stroke-miterlimit="10"></circle></svg>`);
}
function Select($$renderer, $$props) {
  const $$slots = sanitize_slots($$props);
  $$renderer.component(($$renderer2) => {
    let filteredItems, hasValue, hideSelectedItem, showClear, placeholderText, ariaSelection, ariaContext;
    const dispatch = createEventDispatcher();
    let justValue = fallback($$props["justValue"], null);
    let filter$1 = fallback($$props["filter"], filter);
    let getItems$1 = fallback($$props["getItems"], getItems);
    let id = fallback($$props["id"], null);
    let name = fallback($$props["name"], null);
    let container = fallback($$props["container"], void 0);
    let input = fallback($$props["input"], void 0);
    let multiple = fallback($$props["multiple"], false);
    let multiFullItemClearable = fallback($$props["multiFullItemClearable"], false);
    let disabled = fallback($$props["disabled"], false);
    let focused = fallback($$props["focused"], false);
    let value = fallback($$props["value"], null);
    let filterText = fallback($$props["filterText"], "");
    let placeholder = fallback($$props["placeholder"], "Please select");
    let placeholderAlwaysShow = fallback($$props["placeholderAlwaysShow"], false);
    let items = fallback($$props["items"], null);
    let label = fallback($$props["label"], "label");
    let itemFilter = fallback($$props["itemFilter"], (label2, filterText2, option) => `${label2}`.toLowerCase().includes(filterText2.toLowerCase()));
    let groupBy = fallback($$props["groupBy"], void 0);
    let groupFilter = fallback($$props["groupFilter"], (groups) => groups);
    let groupHeaderSelectable = fallback($$props["groupHeaderSelectable"], false);
    let itemId = fallback($$props["itemId"], "value");
    let loadOptions = fallback($$props["loadOptions"], void 0);
    let containerStyles = fallback($$props["containerStyles"], "");
    let hasError = fallback($$props["hasError"], false);
    let filterSelectedItems = fallback($$props["filterSelectedItems"], true);
    let required = fallback($$props["required"], false);
    let closeListOnChange = fallback($$props["closeListOnChange"], true);
    let clearFilterTextOnBlur = fallback($$props["clearFilterTextOnBlur"], true);
    let createGroupHeaderItem = fallback($$props["createGroupHeaderItem"], (groupValue, item) => {
      return { value: groupValue, [label]: groupValue };
    });
    const getFilteredItems = () => {
      return filteredItems;
    };
    let searchable = fallback($$props["searchable"], true);
    let inputStyles = fallback($$props["inputStyles"], "");
    let clearable = fallback($$props["clearable"], true);
    let loading = fallback($$props["loading"], false);
    let listOpen = fallback($$props["listOpen"], false);
    let timeout;
    let debounce = fallback($$props["debounce"], (fn, wait = 1) => {
      clearTimeout(timeout);
      timeout = setTimeout(fn, wait);
    });
    let debounceWait = fallback($$props["debounceWait"], 300);
    let hideEmptyState = fallback($$props["hideEmptyState"], false);
    let inputAttributes = fallback($$props["inputAttributes"], () => ({}), true);
    let listAutoWidth = fallback($$props["listAutoWidth"], true);
    let showChevron = fallback($$props["showChevron"], false);
    let listOffset = fallback($$props["listOffset"], 5);
    let hoverItemIndex = fallback($$props["hoverItemIndex"], 0);
    let floatingConfig = fallback($$props["floatingConfig"], () => ({}), true);
    let containerClasses = fallback($$props["class"], "");
    let activeValue;
    let prev_value;
    let prev_filterText;
    function setValue() {
      if (typeof value === "string") {
        let item = (items || []).find((item2) => item2[itemId] === value);
        value = item || { [itemId]: value, label: value };
      } else if (multiple && Array.isArray(value) && value.length > 0) {
        value = value.map((item) => typeof item === "string" ? { value: item, label: item } : item);
      }
    }
    let _inputAttributes;
    function assignInputAttributes() {
      _inputAttributes = Object.assign(
        {
          autocapitalize: "none",
          autocomplete: "off",
          autocorrect: "off",
          spellcheck: false,
          tabindex: 0,
          type: "text",
          "aria-autocomplete": "list"
        },
        inputAttributes
      );
      if (id) {
        _inputAttributes["id"] = id;
      }
      if (!searchable) {
        _inputAttributes["readonly"] = true;
      }
    }
    function convertStringItemsToObjects(_items) {
      return _items.map((item, index) => {
        return { index, value: item, label: `${item}` };
      });
    }
    function filterGroupedItems(_items) {
      const groupValues = [];
      const groups = {};
      _items.forEach((item) => {
        const groupValue = groupBy(item);
        if (!groupValues.includes(groupValue)) {
          groupValues.push(groupValue);
          groups[groupValue] = [];
          if (groupValue) {
            groups[groupValue].push(Object.assign(createGroupHeaderItem(groupValue, item), {
              id: groupValue,
              groupHeader: true,
              selectable: groupHeaderSelectable
            }));
          }
        }
        groups[groupValue].push(Object.assign({ groupItem: !!groupValue }, item));
      });
      const sortedGroupedItems = [];
      groupFilter(groupValues).forEach((groupValue) => {
        if (groups[groupValue]) sortedGroupedItems.push(...groups[groupValue]);
      });
      return sortedGroupedItems;
    }
    function dispatchSelectedItem() {
      if (multiple) {
        if (JSON.stringify(value) !== JSON.stringify(prev_value)) {
          if (checkValueForDuplicates()) ;
        }
        return;
      }
    }
    function setupMulti() {
      if (value) {
        if (Array.isArray(value)) {
          value = [...value];
        } else {
          value = [value];
        }
      }
    }
    function setValueIndexAsHoverIndex() {
      const valueIndex = filteredItems.findIndex((i) => {
        return i[itemId] === value[itemId];
      });
      checkHoverSelectable(valueIndex, true);
    }
    function checkHoverSelectable(startingIndex = 0, ignoreGroup) {
      hoverItemIndex = startingIndex < 0 ? 0 : startingIndex;
      if (!ignoreGroup && groupBy && filteredItems[hoverItemIndex] && !filteredItems[hoverItemIndex].selectable) {
        setHoverIndex(1);
      }
    }
    function setupFilterText() {
      if (!loadOptions && filterText.length === 0) return;
      if (loadOptions) {
        debounce(
          async function() {
            loading = true;
            let res = await getItems$1({
              dispatch,
              loadOptions,
              convertStringItemsToObjects,
              filterText
            });
            if (res) {
              loading = res.loading;
              listOpen = listOpen ? res.listOpen : filterText.length > 0 ? true : false;
              focused = listOpen && res.focused;
              items = groupBy ? filterGroupedItems(res.filteredItems) : res.filteredItems;
            } else {
              loading = false;
              focused = true;
              listOpen = true;
            }
          },
          debounceWait
        );
      } else {
        listOpen = true;
        if (multiple) {
          activeValue = void 0;
        }
      }
    }
    function computeJustValue() {
      if (multiple) return value ? value.map((item) => item[itemId]) : null;
      return value ? value[itemId] : value;
    }
    function checkValueForDuplicates() {
      let noDuplicates = true;
      if (value) {
        const ids = [];
        const uniqueValues = [];
        value.forEach((val) => {
          if (!ids.includes(val[itemId])) {
            ids.push(val[itemId]);
            uniqueValues.push(val);
          } else {
            noDuplicates = false;
          }
        });
        if (!noDuplicates) value = uniqueValues;
      }
      return noDuplicates;
    }
    function findItem(selection) {
      let matchTo = selection ? selection[itemId] : value[itemId];
      return items.find((item) => item[itemId] === matchTo);
    }
    function updateValueDisplay(items2) {
      if (!items2 || items2.length === 0 || items2.some((item) => typeof item !== "object")) return;
      if (!value || (multiple ? value.some((selection) => !selection || !selection[itemId]) : !value[itemId])) return;
      if (Array.isArray(value)) {
        value = value.map((selection) => findItem(selection) || selection);
      } else {
        value = findItem() || value;
      }
    }
    function handleFocus(e) {
      if (focused && input === document?.activeElement) return;
      input?.focus();
      focused = true;
    }
    function handleClear() {
      value = void 0;
      closeList();
      handleFocus();
    }
    function closeList() {
      if (clearFilterTextOnBlur) {
        filterText = "";
      }
      listOpen = false;
    }
    let ariaValues = fallback($$props["ariaValues"], (values) => {
      return `Option ${values}, selected.`;
    });
    let ariaListOpen = fallback($$props["ariaListOpen"], (label2, count) => {
      return `You are currently focused on option ${label2}. There are ${count} results available.`;
    });
    let ariaFocused = fallback($$props["ariaFocused"], () => {
      return `Select is focused, type to refine list, press down to open the menu.`;
    });
    function handleAriaSelection(_multiple) {
      let selected = void 0;
      if (_multiple && value.length > 0) {
        selected = value.map((v) => v[label]).join(", ");
      } else {
        selected = value[label];
      }
      return ariaValues(selected);
    }
    function handleAriaContent() {
      if (!filteredItems || filteredItems.length === 0) return "";
      let _item = filteredItems[hoverItemIndex];
      if (listOpen && _item) {
        let count = filteredItems ? filteredItems.length : 0;
        return ariaListOpen(_item[label], count);
      } else {
        return ariaFocused();
      }
    }
    onDestroy(() => {
    });
    function setHoverIndex(increment) {
      let selectableFilteredItems = filteredItems.filter((item) => !Object.hasOwn(item, "selectable") || item.selectable === true);
      if (selectableFilteredItems.length === 0) {
        return hoverItemIndex = 0;
      }
      if (hoverItemIndex === filteredItems.length - 1) {
        hoverItemIndex = 0;
      } else {
        hoverItemIndex = hoverItemIndex + increment;
      }
      const hover = filteredItems[hoverItemIndex];
      if (hover && hover.selectable === false) {
        setHoverIndex(increment);
        return;
      }
    }
    function isItemActive(item, value2, itemId2) {
      if (multiple) return;
      return value2 && value2[itemId2] === item[itemId2];
    }
    function isItemFirst(itemIndex) {
      return itemIndex === 0;
    }
    let _floatingConfig = {
      strategy: "absolute",
      placement: "bottom-start",
      middleware: [offset(listOffset), flip(), shift()],
      autoUpdate: false
    };
    const [floatingRef, floatingContent, floatingUpdate] = createFloatingActions(_floatingConfig);
    let prefloat = true;
    function listMounted(list, listOpen2) {
      return prefloat = true;
    }
    if (value) setValue();
    if (inputAttributes || !searchable) assignInputAttributes();
    if (multiple) setupMulti();
    if (multiple && value && value.length > 1) checkValueForDuplicates();
    if (value) dispatchSelectedItem();
    if (!focused && input) closeList();
    if (filterText !== prev_filterText) setupFilterText();
    filteredItems = filter$1({
      loadOptions,
      filterText,
      items,
      multiple,
      value,
      itemId,
      groupBy,
      label,
      filterSelectedItems,
      itemFilter,
      convertStringItemsToObjects,
      filterGroupedItems
    });
    if (!multiple && listOpen && value && filteredItems) setValueIndexAsHoverIndex();
    if (listOpen && multiple) hoverItemIndex = 0;
    if (filterText) hoverItemIndex = 0;
    hasValue = multiple ? value && value.length > 0 : value;
    hideSelectedItem = hasValue && filterText.length > 0;
    showClear = hasValue && clearable && !disabled && !loading;
    placeholderText = placeholderAlwaysShow && multiple ? placeholder : multiple && value?.length === 0 ? placeholder : value ? "" : placeholder;
    ariaSelection = value ? handleAriaSelection(multiple) : "";
    ariaContext = handleAriaContent();
    updateValueDisplay(items);
    justValue = computeJustValue();
    if (listOpen && filteredItems && !multiple && !value) checkHoverSelectable();
    if (container && floatingConfig) floatingUpdate(Object.assign(_floatingConfig, floatingConfig));
    listMounted();
    if (input && listOpen && !focused) handleFocus();
    if (container && floatingConfig?.autoUpdate === void 0) {
      _floatingConfig.autoUpdate = true;
    }
    $$renderer2.push(`<div${attr_class(`svelte-select ${stringify(containerClasses)}`, "svelte-1ul7oo4", {
      "multi": multiple,
      "disabled": disabled,
      "focused": focused,
      "list-open": listOpen,
      "show-chevron": showChevron,
      "error": hasError
    })}${attr_style(containerStyles)} role="none">`);
    if (listOpen) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div${attr_class("svelte-select-list svelte-1ul7oo4", void 0, { "prefloat": prefloat })} role="none">`);
      if ($$slots["list-prepend"]) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<!--[-->`);
        slot($$renderer2, $$props, "list-prepend", {}, null);
        $$renderer2.push(`<!--]-->`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> `);
      if ($$slots.list) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<!--[-->`);
        slot($$renderer2, $$props, "list", { filteredItems }, null);
        $$renderer2.push(`<!--]-->`);
      } else {
        $$renderer2.push("<!--[!-->");
        if (filteredItems.length > 0) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<!--[-->`);
          const each_array = ensure_array_like(filteredItems);
          for (let i = 0, $$length = each_array.length; i < $$length; i++) {
            let item = each_array[i];
            $$renderer2.push(`<div class="list-item svelte-1ul7oo4" tabindex="-1" role="none"><div${attr_class("item svelte-1ul7oo4", void 0, {
              "list-group-title": item.groupHeader,
              "active": isItemActive(item, value, itemId),
              "first": isItemFirst(i),
              "hover": hoverItemIndex === i,
              "group-item": item.groupItem,
              "not-selectable": item?.selectable === false
            })}><!--[-->`);
            slot($$renderer2, $$props, "item", { item, index: i }, () => {
              $$renderer2.push(`${escape_html(item?.[label])}`);
            });
            $$renderer2.push(`<!--]--></div></div>`);
          }
          $$renderer2.push(`<!--]-->`);
        } else {
          $$renderer2.push("<!--[!-->");
          if (!hideEmptyState) {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<!--[-->`);
            slot($$renderer2, $$props, "empty", {}, () => {
              $$renderer2.push(`<div class="empty svelte-1ul7oo4">No options</div>`);
            });
            $$renderer2.push(`<!--]-->`);
          } else {
            $$renderer2.push("<!--[!-->");
          }
          $$renderer2.push(`<!--]-->`);
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]--> `);
      if ($$slots["list-append"]) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<!--[-->`);
        slot($$renderer2, $$props, "list-append", {}, null);
        $$renderer2.push(`<!--]-->`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <span aria-live="polite" aria-atomic="false" aria-relevant="additions text" class="a11y-text svelte-1ul7oo4">`);
    if (focused) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span id="aria-selection" class="svelte-1ul7oo4">${escape_html(ariaSelection)}</span> <span id="aria-context" class="svelte-1ul7oo4">${escape_html(ariaContext)}</span>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></span> <div class="prepend svelte-1ul7oo4"><!--[-->`);
    slot($$renderer2, $$props, "prepend", {}, null);
    $$renderer2.push(`<!--]--></div> <div class="value-container svelte-1ul7oo4">`);
    if (hasValue) {
      $$renderer2.push("<!--[-->");
      if (multiple) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<!--[-->`);
        const each_array_1 = ensure_array_like(value);
        for (let i = 0, $$length = each_array_1.length; i < $$length; i++) {
          let item = each_array_1[i];
          $$renderer2.push(`<div${attr_class("multi-item svelte-1ul7oo4", void 0, { "active": activeValue === i, "disabled": disabled })} role="none"><span class="multi-item-text svelte-1ul7oo4"><!--[-->`);
          slot($$renderer2, $$props, "selection", { selection: item, index: i }, () => {
            $$renderer2.push(`${escape_html(item[label])}`);
          });
          $$renderer2.push(`<!--]--></span> `);
          if (!disabled && !multiFullItemClearable && ClearIcon) {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<div class="multi-item-clear svelte-1ul7oo4"><!--[-->`);
            slot($$renderer2, $$props, "multi-clear-icon", {}, () => {
              ClearIcon($$renderer2);
            });
            $$renderer2.push(`<!--]--></div>`);
          } else {
            $$renderer2.push("<!--[!-->");
          }
          $$renderer2.push(`<!--]--></div>`);
        }
        $$renderer2.push(`<!--]-->`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<div${attr_class("selected-item svelte-1ul7oo4", void 0, { "hide-selected-item": hideSelectedItem })}><!--[-->`);
        slot($$renderer2, $$props, "selection", { selection: value }, () => {
          $$renderer2.push(`${escape_html(value[label])}`);
        });
        $$renderer2.push(`<!--]--></div>`);
      }
      $$renderer2.push(`<!--]-->`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <input${attributes(
      {
        readonly: !searchable,
        ..._inputAttributes,
        value: filterText,
        placeholder: placeholderText,
        style: inputStyles,
        disabled
      },
      "svelte-1ul7oo4",
      void 0,
      void 0,
      4
    )}/></div> <div class="indicators svelte-1ul7oo4">`);
    if (loading) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="icon loading svelte-1ul7oo4" aria-hidden="true"><!--[-->`);
      slot($$renderer2, $$props, "loading-icon", {}, () => {
        LoadingIcon($$renderer2);
      });
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (showClear) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<button type="button" class="icon clear-select svelte-1ul7oo4"><!--[-->`);
      slot($$renderer2, $$props, "clear-icon", {}, () => {
        ClearIcon($$renderer2);
      });
      $$renderer2.push(`<!--]--></button>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (showChevron) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="icon chevron svelte-1ul7oo4" aria-hidden="true"><!--[-->`);
      slot($$renderer2, $$props, "chevron-icon", { listOpen }, () => {
        ChevronIcon($$renderer2);
      });
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> <!--[-->`);
    slot($$renderer2, $$props, "input-hidden", { value }, () => {
      $$renderer2.push(`<input${attr("name", name)} type="hidden"${attr("value", value ? JSON.stringify(value) : null)} class="svelte-1ul7oo4"/>`);
    });
    $$renderer2.push(`<!--]--> `);
    if (required && (!value || value.length === 0)) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<!--[-->`);
      slot($$renderer2, $$props, "required", { value }, () => {
        $$renderer2.push(`<select class="required svelte-1ul7oo4" required tabindex="-1" aria-hidden="true"></select>`);
      });
      $$renderer2.push(`<!--]-->`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div>`);
    bind_props($$props, {
      justValue,
      filter: filter$1,
      getItems: getItems$1,
      id,
      name,
      container,
      input,
      multiple,
      multiFullItemClearable,
      disabled,
      focused,
      value,
      filterText,
      placeholder,
      placeholderAlwaysShow,
      items,
      label,
      itemFilter,
      groupBy,
      groupFilter,
      groupHeaderSelectable,
      itemId,
      loadOptions,
      containerStyles,
      hasError,
      filterSelectedItems,
      required,
      closeListOnChange,
      clearFilterTextOnBlur,
      createGroupHeaderItem,
      searchable,
      inputStyles,
      clearable,
      loading,
      listOpen,
      debounce,
      debounceWait,
      hideEmptyState,
      inputAttributes,
      listAutoWidth,
      showChevron,
      listOffset,
      hoverItemIndex,
      floatingConfig,
      class: containerClasses,
      ariaValues,
      ariaListOpen,
      ariaFocused,
      getFilteredItems,
      handleClear
    });
  });
}
function ApparelList($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let {
      featured,
      products,
      currentPage,
      prodCount,
      pageCount,
      categories,
      sort = void 0,
      perPage = 12
    } = $$props;
    console.log(products);
    const numArray = [1, 2, 3, 4, 5];
    let range = pageCount < 6 ? [...Array(pageCount).keys()].map((i) => i + 1) : currentPage < 3 ? numArray.map((num) => num += 1) : currentPage > pageCount - 3 ? numArray.map((num) => pageCount - 6 + num) : numArray.map((num) => num += currentPage - 3);
    let sortQuery = sort.length ? `sort=${sort}&` : "";
    let sortElements = [
      { value: "name", label: "Title A-Z" },
      { value: "-name", label: "Title Z-A" },
      { value: "-createdAt", label: "Recently Added" },
      { value: "-updatedAt", label: "Recently Updated" },
      { value: "price", label: "Lowest Price" },
      { value: "-price", label: "Highest Price" },
      { value: "-isFeatured", label: "Featured Products" }
    ];
    function handleSelect(event) {
      sort = event.detail.value;
      store_get($$store_subs ??= {}, "$page", page).url.pathname + "?sort=" + sort + "&p=1#productList";
      goto();
    }
    $$renderer2.push(`<div class="container w-full mx-12 px-12"><div class="flex flex-col md:flex-row gap-3"><div class="basis-1 md:basis-1/2 lg:basis-1/4"><div class="sidebar-wrapper style2"><div class="single-sidebar wow fadeInUp animated" data-wow-delay="0.1s" data-wow-duration="1200ms"><div class="sidebar-search-box"><form class="search-form" action="/search" method="GET"><input placeholder="Search" type="search" name="q"/> <button type="submit">`);
    Search($$renderer2, { size: "24" });
    $$renderer2.push(`<!----></button></form></div></div>   <div class="single-sidebar wow fadeInUp animated" data-wow-delay="0.3s" data-wow-duration="1200ms"><div class="categories-box"><div class="title"><h3>Categories</h3></div> <ul class="categories clearfix"><!--[-->`);
    const each_array = ensure_array_like(categories);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let category = each_array[$$index];
      $$renderer2.push(`<li><a${attr("href", `/shop/apparel/categories/${stringify(category.slug?.current || category.slug)}/`)}>${escape_html(category.name)}</a></li>`);
    }
    $$renderer2.push(`<!--]--></ul></div></div>  `);
    FeaturedBar($$renderer2, { featured });
    $$renderer2.push(`<!----></div></div> <div class="basis-1 lg:basis-3/4"><div class="product-items"><div class="flex"><div class="showing-result-shorting w-full"><div class="left"><div class="showing" id="productList"><p>Showing products ${escape_html((currentPage - 1) * perPage + 1)}-${escape_html(Math.min(currentPage * perPage, prodCount))} of ${escape_html(prodCount)} Results</p></div></div> <div class="right"><div class="shorting"><div class="dropdown bootstrap-select svelte-1z13nbw">`);
    Select($$renderer2, {
      items: sortElements,
      placeholder: "Sort results by:",
      showChevron: true,
      onselect: handleSelect
    });
    $$renderer2.push(`<!----></div></div></div></div></div> <div class="all_products"><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"><!--[-->`);
    const each_array_1 = ensure_array_like(products);
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      let product = each_array_1[$$index_1];
      ApparelCard($$renderer2, { product });
    }
    $$renderer2.push(`<!--]--></div></div> `);
    if (prodCount >= perPage) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<nav aria-label="Page navigation example"><ul class="flex justify-end rounded-sm list-none"><li${attr_class("page-item", void 0, { "d-none": currentPage <= 1 })}><a rel="prefetch" class="page-link svelte-1z13nbw"${attr("href", `${stringify(store_get($$store_subs ??= {}, "$page", page).url.pathname)}?${stringify(sortQuery)}p=${stringify(currentPage - 1)}#productList`)} tabindex="-1">Previous</a></li> `);
      if (pageCount > 6) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<li${attr_class("page-item svelte-1z13nbw", void 0, { "disabled": currentPage === 1 })}><a rel="prefetch" class="page-link svelte-1z13nbw"${attr("href", `${stringify(store_get($$store_subs ??= {}, "$page", page).url.pathname)}?${stringify(sortQuery)}p=1#productList`)} tabindex="-1">1</a></li> `);
        if (range[0] > 2) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<p>...</p>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]-->`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> <!--[-->`);
      const each_array_2 = ensure_array_like(range);
      for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
        let pageNum = each_array_2[$$index_2];
        $$renderer2.push(`<li${attr_class("page-item svelte-1z13nbw", void 0, { "disabled": currentPage === pageNum })}><a rel="prefetch" class="page-link svelte-1z13nbw"${attr("href", `${stringify(store_get($$store_subs ??= {}, "$page", page).url.pathname)}?${stringify(sortQuery)}p=${stringify(pageNum)}#productList`)}>${escape_html(pageNum)}</a></li>`);
      }
      $$renderer2.push(`<!--]--> `);
      if (pageCount > 6) {
        $$renderer2.push("<!--[-->");
        if (range[4] < pageCount - 1) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<p>...</p>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> <li${attr_class("page-item svelte-1z13nbw", void 0, { "disabled": currentPage === pageCount })}><a rel="prefetch" class="page-link svelte-1z13nbw"${attr("href", `${stringify(store_get($$store_subs ??= {}, "$page", page).url.pathname)}?${stringify(sortQuery)}p=${stringify(pageCount)}#productList`)} tabindex="-1">${escape_html(pageCount)}</a></li>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> <li${attr_class("page-item", void 0, { "d-none": currentPage == pageCount })}><a rel="prefetch" class="page-link svelte-1z13nbw"${attr("href", `${stringify(store_get($$store_subs ??= {}, "$page", page).url.pathname)}?${stringify(sortQuery)}p=${stringify(currentPage + 1)}#productList`)}>Next</a></li></ul></nav>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></div></div></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
    bind_props($$props, { sort });
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { data } = $$props;
    data.settings;
    const { prodCount, products, categories, featured } = data.prods;
    let perPage = 12;
    let currentPage = parseInt(store_get($$store_subs ??= {}, "$page", page).url.searchParams.get("p")) || 1;
    let sort = store_get($$store_subs ??= {}, "$page", page).url.searchParams.get("sort") || "";
    let baseURL = `/shop/apparel/`;
    let metaURL = currentPage > 1 ? baseURL + "?p=" + currentPage : baseURL;
    let metaImg = "https://cdn.sanity.io/images/nrl6nc45/production/25b2b2cfb677a7b6f7deb6b83ab4775c9a17053d-4160x2340.jpg?&w=400&h=300&auto=format";
    let thisPage = currentPage > 1 ? `| Page ${currentPage} ` : "";
    const metadata = {
      title: `Book Catalogue ${thisPage}| Alkebu-Lan Images`,
      description: `Check out our range of Apparel promoting pan-African culture and positivity`,
      image: metaImg,
      imageAlt: "Alkebu-Lan Images T-Shirts",
      url: metaURL
    };
    Meta($$renderer2, { metadata });
    $$renderer2.push(`<!----> <section class="page-header-modern"><div class="container mx-auto px-4"><nav class="flex items-center gap-2 text-sm text-white/80 mb-4"><a href="/" class="hover:text-white transition-colors">Home</a> <span class="text-white/60">›</span> <a href="/shop/" class="hover:text-white transition-colors">Shop</a> <span class="text-white/60">›</span> <span class="text-white font-medium">Apparel</span></nav> <h1 class="text-3xl md:text-4xl font-bold font-display">Clothing Rack</h1></div></section> <section class="product">`);
    ApparelList($$renderer2, {
      products,
      prodCount,
      categories,
      featured,
      sort,
      currentPage,
      perPage
    });
    $$renderer2.push(`<!----></section>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
