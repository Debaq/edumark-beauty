/**
 * Self-contained interactivity script for exported HTML.
 * Handles: multiple-choice/true-false questions, feedback reveal.
 * Returned as a raw string to be injected inside a <script> tag.
 */
export const interactivityScript = /* js */ `
(function(){
  /* ── Helpers ────────────────────────────────────── */
  function siblings(el, sel) {
    var out = [], node = el.parentElement.firstElementChild;
    while (node) { if (node !== el && node.matches(sel)) out.push(node); node = node.nextElementSibling; }
    return out;
  }

  function nextFeedback(label) {
    var nx = label.nextElementSibling;
    return nx && nx.classList.contains('edm-q-feedback') ? nx : null;
  }

  /* ── Questions (choice / true-false) ────────────── */
  document.addEventListener('click', function(e) {
    var label = e.target.closest('.edm-q-option');
    if (!label) return;

    var question = label.closest('.edm-question');
    if (!question) return;

    /* Already answered — lock interaction */
    if (question.classList.contains('answered')) return;

    var input = label.querySelector('input');
    if (!input) return;

    var isRadio = input.type === 'radio';
    var isCorrect = label.getAttribute('data-correct') === 'true';

    if (isRadio) {
      /* ── Radio: single selection, immediate check ── */
      /* Clear previous selection */
      var allOpts = question.querySelectorAll('.edm-q-option');
      for (var i = 0; i < allOpts.length; i++) {
        allOpts[i].classList.remove('selected', 'correct', 'wrong');
        var fb = nextFeedback(allOpts[i]);
        if (fb) fb.hidden = true;
      }

      /* Mark selection */
      label.classList.add('selected');
      input.checked = true;

      /* Reveal result */
      question.classList.add('answered');

      if (isCorrect) {
        label.classList.add('correct');
      } else {
        label.classList.add('wrong');
        /* Also highlight the correct one */
        for (var j = 0; j < allOpts.length; j++) {
          if (allOpts[j].getAttribute('data-correct') === 'true') {
            allOpts[j].classList.add('correct');
            var cfb = nextFeedback(allOpts[j]);
            if (cfb) cfb.hidden = false;
          }
        }
      }

      /* Show feedback for selected option */
      var fb = nextFeedback(label);
      if (fb) fb.hidden = false;

    } else {
      /* ── Checkbox: toggle selection (no auto-check) ── */
      label.classList.toggle('selected');
      input.checked = label.classList.contains('selected');
    }
  });

  /* ── Checkbox questions: "Check answers" button ── */
  /* Inject a check button into every checkbox-based question */
  var checkboxQuestions = document.querySelectorAll('.edm-question');
  for (var q = 0; q < checkboxQuestions.length; q++) {
    var question = checkboxQuestions[q];
    var firstInput = question.querySelector('.edm-q-option input');
    if (!firstInput || firstInput.type !== 'checkbox') continue;

    var optionsDiv = question.querySelector('.edm-q-options');
    if (!optionsDiv) continue;

    var btn = document.createElement('button');
    btn.className = 'edm-q-check-btn';
    btn.textContent = 'Comprobar';
    btn.addEventListener('click', (function(q, optDiv) {
      return function() {
        if (q.classList.contains('answered')) return;
        q.classList.add('answered');
        var opts = optDiv.querySelectorAll('.edm-q-option');
        for (var i = 0; i < opts.length; i++) {
          var opt = opts[i];
          var correct = opt.getAttribute('data-correct') === 'true';
          var selected = opt.classList.contains('selected');
          if (selected && correct)       opt.classList.add('correct');
          else if (selected && !correct) opt.classList.add('wrong');
          else if (!selected && correct) opt.classList.add('correct');
          opt.classList.remove('selected');
          var fb = nextFeedback(opt);
          if (fb) fb.hidden = false;
        }
        this.disabled = true;
        this.textContent = 'Respondida';
      };
    })(question, optionsDiv));
    optionsDiv.parentElement.appendChild(btn);
  }

  /* ── Reset button for answered questions ────────── */
  document.addEventListener('click', function(e) {
    var resetBtn = e.target.closest('.edm-q-reset-btn');
    if (!resetBtn) return;
    var question = resetBtn.closest('.edm-question');
    if (!question) return;
    question.classList.remove('answered');
    var opts = question.querySelectorAll('.edm-q-option');
    for (var i = 0; i < opts.length; i++) {
      opts[i].classList.remove('selected', 'correct', 'wrong');
      opts[i].querySelector('input').checked = false;
      var fb = nextFeedback(opts[i]);
      if (fb) fb.hidden = true;
    }
    var checkBtn = question.querySelector('.edm-q-check-btn');
    if (checkBtn) { checkBtn.disabled = false; checkBtn.textContent = 'Comprobar'; }
  });

  /* Inject reset buttons */
  var allQuestions = document.querySelectorAll('.edm-question');
  for (var q = 0; q < allQuestions.length; q++) {
    var question = allQuestions[q];
    if (!question.querySelector('.edm-q-option')) continue;
    var resetBtn = document.createElement('button');
    resetBtn.className = 'edm-q-reset-btn';
    resetBtn.textContent = 'Reiniciar';
    var body = question.querySelector('.edm-card-body');
    if (body) body.appendChild(resetBtn);
  }
})();
`

/** CSS for the interactive buttons (check / reset). */
export const interactivityCss = `
/* ── Interactive question buttons ───────────────── */
.edm-preview .edm-q-check-btn,
.edm-preview .edm-q-reset-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
  margin-top: 0.8em;
  padding: 0.45em 1.2em;
  font-size: 0.82em;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid var(--t-border);
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.edm-preview .edm-q-check-btn {
  background: var(--t-accent);
  color: #fff;
  border-color: var(--t-accent);
}
.edm-preview .edm-q-check-btn:hover:not(:disabled) {
  filter: brightness(1.1);
}
.edm-preview .edm-q-check-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.edm-preview .edm-q-reset-btn {
  background: transparent;
  color: var(--t-fg2);
  margin-left: 0.5em;
}
.edm-preview .edm-q-reset-btn:hover {
  background: var(--t-muted-soft);
  color: var(--t-fg1);
}
/* Hide reset until answered */
.edm-question:not(.answered) .edm-q-reset-btn { display: none; }
`
