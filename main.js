import { ORIGINS, VARIETIES, PROCESSES, ROASTS } from "./data.js";
import { computeGrind } from "./grind-logic.js";
import { scanBagImage } from "./ocr.js";
function el(id) {
    const found = document.getElementById(id);
    if (!found)
        throw new Error(`Missing element #${id}`);
    return found;
}
const originSelect = el("origin");
const varietySelect = el("variety");
const processSelect = el("process");
const roastSelect = el("roast");
const scanInput = el("scan-input");
const scanStatus = el("scan-status");
const resultLabel = el("result-label");
const resultReason = el("result-reason");
const marker = el("gauge-marker");
function fillSelect(select, options) {
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "Not sure";
    select.appendChild(blank);
    for (const opt of options) {
        const el = document.createElement("option");
        el.value = opt.value;
        el.textContent = opt.label;
        select.appendChild(el);
    }
}
fillSelect(originSelect, ORIGINS.map((o) => ({ value: o.name, label: o.name })));
fillSelect(varietySelect, VARIETIES.map((v) => ({ value: v.name, label: v.name })));
fillSelect(processSelect, PROCESSES.map((p) => ({ value: p.value, label: p.label })));
fillSelect(roastSelect, ROASTS.map((r) => ({ value: r.value, label: r.label })));
function currentInput() {
    return {
        origin: originSelect.value || null,
        variety: varietySelect.value || null,
        process: (processSelect.value || null),
        roast: (roastSelect.value || null),
    };
}
function render() {
    const result = computeGrind(currentInput());
    resultLabel.textContent = result.label;
    resultReason.textContent = result.reason;
    const percent = (result.stepIndex / 6) * 100;
    marker.style.left = `${percent}%`;
}
for (const select of [originSelect, varietySelect, processSelect, roastSelect]) {
    select.addEventListener("change", render);
}
scanInput.addEventListener("change", async () => {
    const file = scanInput.files?.[0];
    if (!file)
        return;
    scanStatus.textContent = "Reading label…";
    scanStatus.classList.add("visible");
    try {
        const match = await scanBagImage(file, (status) => {
            scanStatus.textContent = status;
        });
        if (match.origin)
            originSelect.value = match.origin;
        if (match.variety)
            varietySelect.value = match.variety;
        if (match.process)
            processSelect.value = match.process;
        const filled = [match.origin, match.variety, match.process].filter(Boolean).length;
        scanStatus.textContent =
            filled > 0
                ? `Filled ${filled} field${filled > 1 ? "s" : ""} from the label. Check them, then set roast level.`
                : "Couldn't match text on the label. Fill the fields in by hand.";
        render();
    }
    catch (err) {
        scanStatus.textContent = "Scan failed. Fill the fields in by hand.";
    }
});
render();
