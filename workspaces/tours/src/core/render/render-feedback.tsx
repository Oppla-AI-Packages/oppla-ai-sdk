import type { FlowFeedbackStep } from "..";
// import { getPersistentState } from "../../lib/persistent-state";
import type { FlowState } from "../flow-state";
import { createRoot, getStepFooter, getStepHeader } from "./render-common";




/**
 * Function for rendering feedback element to HTMLElement without placing it in the DOM.
 */
export const renderFeedbackElement = ({
  step,
  isFirstStep,
  isLastStep,
  root: _root,
}: {
  step: FlowFeedbackStep;
  isLastStep: boolean;
  isFirstStep: boolean;
  root?: HTMLElement;
}): { root: HTMLElement } => {
  const root = _root ?? createRoot({ step });

  const modalContent = (
    <div className="flows-feedback-wrapper">
      <div className="flows-feedback-container">
  {getStepHeader({ step })}
      <form id="feedbackForm">
        {step.body && (
          <div
            className="flows-feedback-body"
            dangerouslySetInnerHTML={{
              __html: `
              ${step.body}
              <script>
                document.getElementById('feedbackForm').addEventListener('submit', function(event) {
                  event.preventDefault(); // Prevent the default form submission
                  const formData = new FormData(event.target);
                  const data = Object.fromEntries(formData.entries()); // Convert to JSON object
                  console.log("button clicked")
                  fetch('https://webhook.site/60f2eeab-64a7-4ed3-b12a-a631f417cc2a', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({data: "Siya Ram"}),
                  })
                  .then(response => response.json())
                  .then(data => console.log('Success:', data))
                  .catch(error => console.error('Error:', error));
                });
              </script>
              `,
            }}
          />
        )}
        {getStepFooter({ step, isFirstStep, isLastStep, type:'feedback' })}
      </form>
    </div>
      
    </div>
  );

  if (!step.hideOverlay) {
    root.appendChild(
      <div
        className={`flows-modal-overlay${step.closeOnOverlayClick ? " flows-overlay-cancel" : ""}`}
        style={step.disableOverlayClickLayer ?  "pointerEvents: none;" : ""}
      />,
    );
  }
  root.appendChild(modalContent);

  return { root };
};

/**
 * Render feedback and attach it to the DOM
 */
export const renderFeedback = ({
  root,
  step,
  state,
}: {
  root: HTMLElement;
  step: FlowFeedbackStep;
  state: FlowState;
}): void => {
  renderFeedbackElement({
    step,
    root,
    isFirstStep: !state.hasPrevStep,
    isLastStep: !state.hasNextStep,
  });
};