/**
 * CBT Calculator Component
 * Draggable scientific calculator for CBT exams.
 * Features: arithmetic, trig, log, ln, sqrt, factorial (!), power (xⁿ),
 *           memory, ANS, DEG/RAD/GRD, state persistence per exam.
 */
(function () {
  "use strict";

  var calcEl = null;
  var displayEl = null;
  var expressionEl = null;
  var angleModeBtn = null;

  var isDragging = false;
  var dragOffsetX = 0;
  var dragOffsetY = 0;

  // State
  var memory = 0;
  var expression = "";
  var displayValue = "0";
  var openParens = 0;
  var angleMode = "DEG"; // DEG | RAD | GRD
  var calcMode = "basic"; // basic | scientific
  var lastAnswer = 0;
  var justCalculated = false;
  var calculatorPowered = true;

  function init() {
    calcEl = document.getElementById("cbt-calculator");
    if (!calcEl) return;

    displayEl = calcEl.querySelector("#calc-display");
    expressionEl = calcEl.querySelector("#calc-expression");
    angleModeBtn = calcEl.querySelector("#calc-angle-mode");

    // Close button
    var closeBtn = calcEl.querySelector("#calc-close-btn");
    if (closeBtn) closeBtn.addEventListener("click", hideCalculator);

    // Angle mode cycling
    if (angleModeBtn) {
      angleModeBtn.addEventListener("click", cycleAngleMode);
    }

    // Mode toggle (basic/scientific)
    var modeToggleBtn = calcEl.querySelector("#calc-mode-toggle");
    if (modeToggleBtn) {
      modeToggleBtn.addEventListener("click", function () {
        setMode(calcMode === "basic" ? "scientific" : "basic");
      });
    }

    // Button clicks via event delegation
    calcEl.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-action]");
      if (!btn) return;
      handleAction(btn.getAttribute("data-action"), btn.getAttribute("data-value"));
    });

    // Drag handling
    var header = calcEl.querySelector("#calc-drag-handle");
    if (header) {
      header.addEventListener("mousedown", startDrag);
      header.addEventListener("touchstart", startDragTouch, { passive: false });
    }
    document.addEventListener("mousemove", onDrag);
    document.addEventListener("mouseup", stopDrag);
    document.addEventListener("touchmove", onDragTouch, { passive: false });
    document.addEventListener("touchend", stopDrag);

    // Keyboard support
    calcEl.setAttribute("tabindex", "-1");
    calcEl.addEventListener("keydown", handleKeyDown);

    // Restore persisted state
    restoreState();
    applyModeVisibility();
    updateModeToggleUI();
  }

  // ── Angle mode ──────────────────────────────────────────────

  var ANGLE_MODES = ["DEG", "RAD", "GRD"];

  function cycleAngleMode() {
    var idx = ANGLE_MODES.indexOf(angleMode);
    angleMode = ANGLE_MODES[(idx + 1) % 3];
    updateAngleModeUI();
    saveState();
  }

  function updateAngleModeUI() {
    if (!angleModeBtn) return;
    angleModeBtn.textContent = angleMode;
    angleModeBtn.classList.remove("bg-blue-600", "bg-purple-600", "bg-amber-600");
    if (angleMode === "DEG") angleModeBtn.classList.add("bg-blue-600");
    else if (angleMode === "RAD") angleModeBtn.classList.add("bg-purple-600");
    else angleModeBtn.classList.add("bg-amber-600");
  }

  // ── Mode toggle (basic / scientific) ────────────────────────

  function setMode(mode) {
    calcMode = mode;
    applyModeVisibility();
    updateModeToggleUI();
    saveState();
  }

  function applyModeVisibility() {
    if (!calcEl) return;
    var sciEls = calcEl.querySelectorAll("[data-sci]");
    for (var i = 0; i < sciEls.length; i++) {
      sciEls[i].style.display = calcMode === "scientific" ? "" : "none";
    }
  }

  function updateModeToggleUI() {
    var btn = calcEl ? calcEl.querySelector("#calc-mode-toggle") : null;
    if (!btn) return;
    var basicPower = calcEl.querySelector("#calc-power-btn");
    var sciPower = calcEl.querySelector("#calc-power-sci-btn");
    if (basicPower) basicPower.style.display = calcMode === "scientific" ? "none" : "";
    if (sciPower) sciPower.style.display = calcMode === "scientific" ? "" : "none";
    if (calcMode === "scientific") {
      btn.textContent = "Sci";
      btn.title = "Switch to basic mode";
      btn.classList.remove("bg-slate-600");
      btn.classList.add("bg-indigo-600");
    } else {
      btn.textContent = "Basic";
      btn.title = "Switch to scientific mode";
      btn.classList.remove("bg-indigo-600");
      btn.classList.add("bg-slate-600");
    }
  }

  function toRadians(x) {
    if (angleMode === "DEG") return (x * Math.PI) / 180;
    if (angleMode === "GRD") return (x * Math.PI) / 200;
    return x;
  }

  function fromRadians(x) {
    if (angleMode === "DEG") return (x * 180) / Math.PI;
    if (angleMode === "GRD") return (x * 200) / Math.PI;
    return x;
  }

  // ── Toggle / Show / Hide ────────────────────────────────────

  function toggleCalculator() {
    if (!calcEl) return;
    if (calcEl.classList.contains("hidden")) showCalculator();
    else hideCalculator();
  }

  function showCalculator() {
    if (!calcEl) return;
    calcEl.classList.remove("hidden");
    calcEl.style.display = "flex";
    if (!calcEl.style.left && !calcEl.style.right) {
      calcEl.style.right = "20px";
      calcEl.style.bottom = "80px";
    }
    restoreState();
    calcEl.focus();
  }

  function hideCalculator() {
    if (!calcEl) return;
    saveState();
    calcEl.classList.add("hidden");
    calcEl.style.display = "none";
  }

  // ── Action dispatcher ───────────────────────────────────────

  function handleAction(action, value) {
    if (!calculatorPowered && action !== "power_toggle") return;
    switch (action) {
      case "power_toggle":
        togglePower();
        break;
      case "digit":
        appendDigit(value);
        break;
      case "operator":
        appendOperator(value);
        break;
      case "decimal":
        appendDecimal();
        break;
      case "clear":
        clearAll();
        break;
      case "clear_entry":
        clearEntry();
        break;
      case "backspace":
        backspace();
        break;
      case "equals":
        calculate();
        break;
      case "paren":
        appendParen(value);
        break;
      case "trig":
        appendTrig(value);
        break;
      case "log":
        appendLog(value);
        break;
      case "sqrt":
        appendFunction("sqrt");
        break;
      case "function":
        appendFunction(value);
        break;
      case "power":
        appendOperator("^");
        break;
      case "square":
        appendSquare();
        break;
      case "reciprocal":
        appendReciprocal();
        break;
      case "factorial":
        appendFactorial();
        break;
      case "pi":
        appendConstant(Math.PI);
        break;
      case "euler":
        appendConstant(Math.E);
        break;
      case "negate":
        negate();
        break;
      case "percent":
        appendPercent();
        break;
      case "ans":
        appendAns();
        break;
      case "mem_clear":
        memory = 0;
        flashDisplay("MC");
        break;
      case "mem_recall":
        appendToExpression(String(memory));
        displayValue = String(memory);
        updateDisplay();
        break;
      case "mem_add":
        memory += parseFloat(displayValue) || 0;
        flashDisplay("M+");
        break;
      case "mem_subtract":
        memory -= parseFloat(displayValue) || 0;
        flashDisplay("M\u2212");
        break;
    }
    saveState();
  }

  // ── Power toggle ───────────────────────────────────────────

  function togglePower() {
    calculatorPowered = !calculatorPowered;
    if (calcEl) calcEl.classList.toggle("calculator-off", !calculatorPowered);
    var buttons = calcEl ? calcEl.querySelectorAll("#calc-power-btn, #calc-power-sci-btn") : [];
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].textContent = calculatorPowered ? "ON" : "OFF";
      buttons[i].classList.toggle("bg-emerald-500", calculatorPowered);
      buttons[i].classList.toggle("hover:bg-emerald-600", calculatorPowered);
      buttons[i].classList.toggle("bg-slate-500", !calculatorPowered);
      buttons[i].classList.toggle("hover:bg-slate-600", !calculatorPowered);
    }
    if (calculatorPowered) {
      updateDisplay();
    } else if (displayEl) {
      displayEl.textContent = "OFF";
    }
    saveState();
  }

  function appendSquare() {
    if (!calculatorPowered) return;
    appendOperator("^");
    appendToExpression("2");
    displayValue = "0";
    updateDisplay();
  }

  function appendReciprocal() {
    if (!calculatorPowered) return;
    appendToExpression("1/");
    displayValue = "0";
    updateDisplay();
  }

  // ── Building expressions ────────────────────────────────────

  function appendToExpression(str) {
    justCalculated = false;
    expression += str;
  }

  function appendDigit(d) {
    if (justCalculated) {
      expression = "";
      justCalculated = false;
    }
    if (displayValue === "0" || displayValue === "-0") {
      displayValue = displayValue.startsWith("-") ? "-" + d : d;
    } else {
      displayValue += d;
    }
    appendToExpression(d);
    updateDisplay();
  }

  function appendDecimal() {
    if (justCalculated) {
      expression = "";
      justCalculated = false;
    }
    if (displayValue.indexOf(".") === -1) {
      displayValue += ".";
      appendToExpression(".");
      updateDisplay();
    }
  }

  function appendOperator(op) {
    justCalculated = false;
    var sym = op === "*" ? "×" : op === "/" ? "÷" : op;
    appendToExpression(sym);
    displayValue = "0";
    updateDisplay();
  }

  function appendParen(p) {
    justCalculated = false;
    if (p === "(") {
      openParens++;
      appendToExpression("(");
    } else if (p === ")" && openParens > 0) {
      openParens--;
      appendToExpression(")");
    }
    displayValue = "0";
    updateDisplay();
  }

  function appendTrig(fn) {
    justCalculated = false;
    appendToExpression(fn + "(");
    openParens++;
    displayValue = "0";
    updateDisplay();
  }

  function appendLog(fn) {
    justCalculated = false;
    appendToExpression(fn === "ln" ? "ln(" : "log(");
    openParens++;
    displayValue = "0";
    updateDisplay();
  }

  function appendFunction(fn) {
    justCalculated = false;
    appendToExpression(fn + "(");
    openParens++;
    displayValue = "0";
    updateDisplay();
  }

  function appendConstant(c) {
    justCalculated = false;
    var s = String(Math.round(c * 1e10) / 1e10);
    displayValue = s;
    appendToExpression(s);
    updateDisplay();
  }

  function appendAns() {
    justCalculated = false;
    var s = String(lastAnswer);
    displayValue = s;
    appendToExpression("Ans");
    updateDisplay();
  }

  function appendFactorial() {
    justCalculated = false;
    appendToExpression("!");
    updateDisplay();
  }

  function appendPercent() {
    justCalculated = false;
    appendToExpression("/100");
    updateDisplay();
  }

  function negate() {
    justCalculated = false;
    if (displayValue.startsWith("-")) {
      displayValue = displayValue.substring(1);
    } else {
      displayValue = "-" + displayValue;
    }
    // Rebuild expression with negated trailing number
    expression = expression.replace(/-?[\d.]+$/, displayValue);
    updateDisplay();
  }

  function clearAll() {
    expression = "";
    displayValue = "0";
    openParens = 0;
    justCalculated = false;
    updateDisplay();
    saveState();
  }

  function clearEntry() {
    if (!calculatorPowered) return;
    displayValue = "0";
    expression = expression.replace(/[\d.]+$/, "");
    updateDisplay();
    saveState();
  }

  function backspace() {
    if (justCalculated) {
      clearAll();
      return;
    }
    if (expression.length > 0) {
      // Handle multi-char tokens: "Ans", "sin(", "cos(", "tan(", "log(", "ln(", "sqrt("
      var m = expression.match(/(Ans|sin\(|cos\(|tan\(|log\(|ln\(|sqrt\()$/);
      if (m) {
        var token = m[0];
        expression = expression.slice(0, -token.length);
        if (token.endsWith("(")) openParens--;
      } else {
        expression = expression.slice(0, -1);
      }
      // Update displayValue from the tail of expression
      var tail = expression.match(/[\d.]+$/);
      displayValue = tail ? tail[0] : "0";
      updateDisplay();
    }
  }

  // ── Calculation engine ──────────────────────────────────────

  function factorial(n) {
    if (n < 0 || n > 170) return NaN;
    if (n === 0 || n === 1) return 1;
    var r = 1;
    for (var i = 2; i <= n; i++) r *= i;
    return r;
  }

  function calculate() {
    if (!expression) return;

    try {
      var expr = expression;

      // Replace display symbols with JS operators
      expr = expr.replace(/×/g, "*");
      expr = expr.replace(/÷/g, "/");
      expr = expr.replace(/\^/g, "**");

      // Replace Ans token with lastAnswer value
      expr = expr.replace(/\bAns\b/g, "(" + String(lastAnswer) + ")");

      // Handle factorial: N! → __fact__(N)
      // Process from right to left to handle chained factorials
      expr = expr.replace(/(\d+(\.\d+)?)!/g, "__fact__($1)");
      // Also handle )! pattern
      var safety = 5;
      while (/\)!/.test(expr) && safety-- > 0) {
        expr = expr.replace(/\)!/, ")__FACT_CLOSE__");
        expr = expr.replace(/__FACT_CLOSE__/, "!FACT_PAREN__");
        // Find matching open paren
        var depth = 0;
        var closeIdx = expr.indexOf("!FACT_PAREN__");
        var openIdx = closeIdx;
        for (var i = closeIdx - 1; i >= 0; i--) {
          if (expr[i] === ")") depth++;
          if (expr[i] === "(") {
            if (depth === 0) { openIdx = i; break; }
            depth--;
          }
        }
        var inner = expr.substring(openIdx + 1, closeIdx);
        expr = expr.substring(0, openIdx) + "__fact__(" + inner + ")" + expr.substring(closeIdx + 13);
      }

      // Convert named functions
      expr = expr.replace(/\bsin\(/g, "__sin__(");
      expr = expr.replace(/\bcos\(/g, "__cos__(");
      expr = expr.replace(/\btan\(/g, "__tan__(");
      expr = expr.replace(/\blog\(/g, "__log10__(");
      expr = expr.replace(/\bln\(/g, "__ln__(");
      expr = expr.replace(/\bsqrt\(/g, "__sqrt__(");

      // Close unclosed parens
      for (var j = 0; j < openParens; j++) expr += ")";
      openParens = 0;

      // Remove trailing operators
      expr = expr.replace(/[+\-*/^]+$/, "");

      if (!expr) {
        displayValue = "0";
        updateDisplay();
        return;
      }

      // Build angle conversion helpers
      var toRad = "";
      var fromRad = "";
      if (angleMode === "DEG") {
        toRad = "*(Math.PI/180)";
        fromRad = "*(180/Math.PI)";
      } else if (angleMode === "GRD") {
        toRad = "*(Math.PI/200)";
        fromRad = "*(200/Math.PI)";
      } else {
        toRad = "";
        fromRad = "";
      }

      var result = Function(
        '"use strict";' +
          "var __sin__ = function(x) { return Math.sin(" + (toRad ? "x" + toRad : "x") + "); };" +
          "var __cos__ = function(x) { return Math.cos(" + (toRad ? "x" + toRad : "x") + "); };" +
          "var __tan__ = function(x) { return Math.tan(" + (toRad ? "x" + toRad : "x") + "); };" +
          "var __log10__ = function(x) { return Math.log10(x); };" +
          "var __ln__ = function(x) { return Math.log(x); };" +
          "var __sqrt__ = function(x) { return Math.sqrt(x); };" +
          "var __fact__ = function(n) {" +
          "  n = Math.round(n);" +
          "  if (n < 0 || n > 170) return NaN;" +
          "  if (n === 0 || n === 1) return 1;" +
          "  var r = 1; for (var i = 2; i <= n; i++) r *= i; return r;" +
          "};" +
          "return (" + expr + ");"
      )();

      if (typeof result === "number" && isFinite(result)) {
        var rounded = Math.round(result * 1e10) / 1e10;
        lastAnswer = rounded;
        displayValue = String(rounded);
        expression = displayValue;
        justCalculated = true;
      } else {
        displayValue = "Error";
        justCalculated = true;
      }
      updateDisplay();
      saveState();
    } catch (e) {
      displayValue = "Error";
      justCalculated = true;
      updateDisplay();
    }
  }

  // ── Display ─────────────────────────────────────────────────

  function updateDisplay() {
    if (displayEl) displayEl.textContent = displayValue;
    if (expressionEl) expressionEl.textContent = expression || "0";
    updateAngleModeUI();
  }

  function flashDisplay(text) {
    if (displayEl) {
      var orig = displayValue;
      displayEl.textContent = text;
      setTimeout(function () {
        displayEl.textContent = orig;
      }, 400);
    }
  }

  // ── State persistence ───────────────────────────────────────

  function getStateKey() {
    var pathParts = window.location.pathname.split("/");
    var examId = pathParts[pathParts.length - 2] || "unknown";
    return "cbt_calc_state_" + examId;
  }

  function saveState() {
    try {
      var state = {
        expression: expression,
        displayValue: displayValue,
        memory: memory,
        angleMode: angleMode,
        calcMode: calcMode,
        openParens: openParens,
        lastAnswer: lastAnswer,
        justCalculated: justCalculated,
        calculatorPowered: calculatorPowered,
        // Save position
        left: calcEl.style.left || "",
        top: calcEl.style.top || "",
        right: calcEl.style.right || "",
        bottom: calcEl.style.bottom || "",
      };
      sessionStorage.setItem(getStateKey(), JSON.stringify(state));
    } catch (e) {
      /* ignore */
    }
  }

  function restoreState() {
    try {
      var raw = sessionStorage.getItem(getStateKey());
      if (!raw) return;
      var state = JSON.parse(raw);
      expression = state.expression || "";
      displayValue = state.displayValue || "0";
      memory = state.memory || 0;
      angleMode = state.angleMode || "DEG";
      calcMode = state.calcMode || "basic";
      openParens = state.openParens || 0;
      lastAnswer = state.lastAnswer || 0;
      justCalculated = state.justCalculated || false;
      calculatorPowered = state.calculatorPowered !== undefined ? state.calculatorPowered : true;
      if (state.left) calcEl.style.left = state.left;
      if (state.top) calcEl.style.top = state.top;
      if (state.right) calcEl.style.right = state.right;
      if (state.bottom) calcEl.style.bottom = state.bottom;
      applyModeVisibility();
      updateModeToggleUI();
      updateDisplay();
      if (calcEl) {
        calcEl.classList.toggle("calculator-off", !calculatorPowered);
        if (!calculatorPowered && displayEl) displayEl.textContent = "OFF";
        var pBtns = calcEl.querySelectorAll("#calc-power-btn, #calc-power-sci-btn");
        for (var k = 0; k < pBtns.length; k++) {
          pBtns[k].textContent = calculatorPowered ? "ON" : "OFF";
          pBtns[k].classList.toggle("bg-emerald-500", calculatorPowered);
          pBtns[k].classList.toggle("hover:bg-emerald-600", calculatorPowered);
          pBtns[k].classList.toggle("bg-slate-500", !calculatorPowered);
          pBtns[k].classList.toggle("hover:bg-slate-600", !calculatorPowered);
        }
      }
    } catch (e) {
      /* ignore */
    }
  }

  function clearState() {
    try {
      sessionStorage.removeItem(getStateKey());
    } catch (e) {
      /* ignore */
    }
  }

  // ── Keyboard ────────────────────────────────────────────────

  function handleKeyDown(e) {
    var key = e.key;
    if (key >= "0" && key <= "9") handleAction("digit", key);
    else if (key === "+") handleAction("operator", "+");
    else if (key === "-") handleAction("operator", "-");
    else if (key === "*") handleAction("operator", "*");
    else if (key === "/") handleAction("operator", "/");
    else if (key === ".") handleAction("decimal");
    else if (key === "Enter" || key === "=") handleAction("equals");
    else if (key === "Backspace") handleAction("backspace");
    else if (key === "Escape") handleAction("clear");
    else if (key === "(") handleAction("paren", "(");
    else if (key === ")") handleAction("paren", ")");
    else if (key === "^") handleAction("power");
    else if (key === "!") handleAction("factorial");
    else if (key === "%") handleAction("percent");
  }

  // ── Drag ────────────────────────────────────────────────────

  function startDrag(e) {
    isDragging = true;
    var rect = calcEl.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    calcEl.style.right = "auto";
    calcEl.style.left = rect.left + "px";
    calcEl.style.top = rect.top + "px";
    calcEl.style.bottom = "auto";
    e.preventDefault();
  }

  function onDrag(e) {
    if (!isDragging || !calcEl) return;
    calcEl.style.left = e.clientX - dragOffsetX + "px";
    calcEl.style.top = e.clientY - dragOffsetY + "px";
  }

  function stopDrag() {
    if (isDragging) {
      isDragging = false;
      saveState();
    }
  }

  function startDragTouch(e) {
    isDragging = true;
    var rect = calcEl.getBoundingClientRect();
    var touch = e.touches[0];
    dragOffsetX = touch.clientX - rect.left;
    dragOffsetY = touch.clientY - rect.top;
    calcEl.style.right = "auto";
    calcEl.style.left = rect.left + "px";
    calcEl.style.top = rect.top + "px";
    calcEl.style.bottom = "auto";
    e.preventDefault();
  }

  function onDragTouch(e) {
    if (!isDragging || !calcEl) return;
    var touch = e.touches[0];
    calcEl.style.left = touch.clientX - dragOffsetX + "px";
    calcEl.style.top = touch.clientY - dragOffsetY + "px";
  }

  // ── Public API ──────────────────────────────────────────────

  window.CBTCalculator = {
    init: init,
    show: showCalculator,
    hide: hideCalculator,
    toggle: toggleCalculator,
    clear: clearAll,
  };
})();
