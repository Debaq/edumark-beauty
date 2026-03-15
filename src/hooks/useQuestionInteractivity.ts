import { useEffect, type RefObject } from 'react'

function nextFeedback(el: Element): HTMLElement | null {
  const nx = el.nextElementSibling
  return nx && nx.classList.contains('edm-q-feedback') ? (nx as HTMLElement) : null
}

/**
 * Adds interactive behaviour to edm questions rendered inside `root`.
 * Re-runs whenever `html` changes (new render).
 */
export function useQuestionInteractivity(
  rootRef: RefObject<HTMLElement | null>,
  html: string,
) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    /* ── Inject buttons ──────────────────────────── */
    root.querySelectorAll('.edm-question').forEach((question) => {
      if (!question.querySelector('.edm-q-option')) return

      // Check button for checkbox questions
      const firstInput = question.querySelector('.edm-q-option input') as HTMLInputElement | null
      if (firstInput?.type === 'checkbox' && !question.querySelector('.edm-q-check-btn')) {
        const btn = document.createElement('button')
        btn.className = 'edm-q-check-btn'
        btn.textContent = 'Comprobar'
        question.querySelector('.edm-card-body')?.appendChild(btn)
      }

      // Reset button
      if (!question.querySelector('.edm-q-reset-btn')) {
        const btn = document.createElement('button')
        btn.className = 'edm-q-reset-btn'
        btn.textContent = 'Reiniciar'
        question.querySelector('.edm-card-body')?.appendChild(btn)
      }
    })

    /* ── Click delegation ────────────────────────── */
    function handleClick(e: MouseEvent) {
      const target = e.target as Element

      /* — option click — */
      const label = target.closest('.edm-q-option')
      if (label) {
        const question = label.closest('.edm-question')
        if (!question || question.classList.contains('answered')) return

        const input = label.querySelector('input') as HTMLInputElement | null
        if (!input) return

        if (input.type === 'radio') {
          const allOpts = question.querySelectorAll('.edm-q-option')
          allOpts.forEach((o) => {
            o.classList.remove('selected', 'correct', 'wrong')
            const fb = nextFeedback(o)
            if (fb) fb.hidden = true
          })

          label.classList.add('selected')
          input.checked = true
          question.classList.add('answered')

          if (label.getAttribute('data-correct') === 'true') {
            label.classList.add('correct')
          } else {
            label.classList.add('wrong')
            allOpts.forEach((o) => {
              if (o.getAttribute('data-correct') === 'true') {
                o.classList.add('correct')
                const fb = nextFeedback(o)
                if (fb) fb.hidden = false
              }
            })
          }
          const fb = nextFeedback(label)
          if (fb) fb.hidden = false
        } else {
          label.classList.toggle('selected')
          input.checked = label.classList.contains('selected')
        }
        return
      }

      /* — check button (checkbox questions) — */
      const checkBtn = target.closest('.edm-q-check-btn') as HTMLButtonElement | null
      if (checkBtn) {
        const question = checkBtn.closest('.edm-question')
        if (!question || question.classList.contains('answered')) return
        question.classList.add('answered')
        question.querySelectorAll('.edm-q-option').forEach((opt) => {
          const correct = opt.getAttribute('data-correct') === 'true'
          const selected = opt.classList.contains('selected')
          if (selected && correct) opt.classList.add('correct')
          else if (selected && !correct) opt.classList.add('wrong')
          else if (!selected && correct) opt.classList.add('correct')
          opt.classList.remove('selected')
          const fb = nextFeedback(opt)
          if (fb) fb.hidden = false
        })
        checkBtn.disabled = true
        checkBtn.textContent = 'Respondida'
        return
      }

      /* — reset button — */
      const resetBtn = target.closest('.edm-q-reset-btn')
      if (resetBtn) {
        const question = resetBtn.closest('.edm-question')
        if (!question) return
        question.classList.remove('answered')
        question.querySelectorAll('.edm-q-option').forEach((opt) => {
          opt.classList.remove('selected', 'correct', 'wrong')
          const inp = opt.querySelector('input') as HTMLInputElement
          if (inp) inp.checked = false
          const fb = nextFeedback(opt)
          if (fb) fb.hidden = true
        })
        const cb = question.querySelector('.edm-q-check-btn') as HTMLButtonElement | null
        if (cb) {
          cb.disabled = false
          cb.textContent = 'Comprobar'
        }
      }
    }

    root.addEventListener('click', handleClick)
    return () => root.removeEventListener('click', handleClick)
  }, [html])
}
