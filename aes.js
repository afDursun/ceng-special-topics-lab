const statusEl = document.querySelector("#status");
const runAllBtn = document.querySelector("#run-all");
const cells = [...document.querySelectorAll(".cell")];

let pyodide = null;
let execCount = 0;
let running = false;

function setStatus(text, ok) {
  statusEl.textContent = text;
  statusEl.classList.toggle("ready", ok === true);
  statusEl.classList.toggle("error", ok === false);
}

const editors = new WeakMap();

function getCode(cell) {
  const editor = editors.get(cell);
  if (editor) return editor.getValue();
  const textarea = cell.querySelector("textarea");
  return textarea ? textarea.value : "";
}

function setPrompt(cell, n) {
  const prompt = cell.querySelector(".prompt");
  prompt.textContent = n == null ? "In [ ]" : `In [${n}]`;
}

function showOut(cell, text, isError) {
  const out = cell.querySelector(".out");
  out.replaceChildren();
  out.classList.toggle("err", Boolean(isError));

  if (!text || !text.trim()) {
    out.hidden = true;
    return;
  }

  out.hidden = false;
  const lines = text.replace(/\s+$/u, "").split("\n");

  const pre = document.createElement("pre");
  pre.className = "out-text";
  pre.textContent = `${lines.join("\n")}\n`;
  out.append(pre);
}

async function runCell(cell) {
  if (!pyodide || running) return;
  running = true;
  const code = getCode(cell);
  const button = cell.querySelector(".run");
  button.disabled = true;

  pyodide.globals.set("__lab_code__", code);

  try {
    await pyodide.runPythonAsync(`
import io, sys, traceback
__lab_buf__ = io.StringIO()
__lab_out__, __lab_err__ = sys.stdout, sys.stderr
sys.stdout = sys.stderr = __lab_buf__
__lab_exc__ = None
try:
    exec(__lab_code__, globals())
except Exception:
    __lab_exc__ = traceback.format_exc()
finally:
    sys.stdout, sys.stderr = __lab_out__, __lab_err__
    __lab_captured__ = __lab_buf__.getvalue()
`);
    const captured = pyodide.runPython("__lab_captured__") || "";
    const exc = pyodide.runPython("__lab_exc__");
    execCount += 1;
    setPrompt(cell, execCount);
    if (exc) {
      const message = captured ? `${captured}\n${exc}` : exc;
      showOut(cell, message, true);
    } else {
      showOut(cell, captured, false);
    }
  } catch (err) {
    execCount += 1;
    setPrompt(cell, execCount);
    showOut(cell, err.message, true);
  } finally {
    running = false;
    button.disabled = false;
  }
}

async function runAll() {
  if (!pyodide || running) return;
  for (const cell of cells) {
    await runCell(cell);
  }
}

async function main() {
  cells.forEach((cell) => {
    const textarea = cell.querySelector("textarea");
    if (window.CodeMirror) {
      const editor = CodeMirror.fromTextArea(textarea, {
        mode: "python",
        lineNumbers: false,
        indentUnit: 4,
        tabSize: 4,
        lineWrapping: true,
        viewportMargin: Infinity,
        extraKeys: {
          "Shift-Enter": () => {
            runCell(cell);
            return false;
          },
        },
      });
      editors.set(cell, editor);
    } else {
      textarea.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && (event.shiftKey || event.metaKey)) {
          event.preventDefault();
          runCell(cell);
        }
      });
    }
    cell.querySelector(".run").addEventListener("click", () => runCell(cell));
  });
  runAllBtn.addEventListener("click", runAll);

  try {
    pyodide = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/",
    });
    await pyodide.runPythonAsync(document.querySelector("#aes-core").textContent);
    setStatus("Hazır. Hücreleri sırayla çalıştır.", true);
    document.querySelectorAll(".run, #run-all").forEach((btn) => {
      btn.disabled = false;
    });
  } catch (err) {
    setStatus("Python yüklenemedi. İnternet bağlantını kontrol et.", false);
  }
}

main();
