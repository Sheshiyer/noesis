export function getRitualProcessingTitle(commandTitle: string): string {
  return `Receiving ${commandTitle}…`;
}

export function buildRitualProcessingMessages(workflowName: string): string[] {
  const workflowLabel = workflowName.trim() || "This workflow";

  return [
    "Triangulating the witness prompt.",
    `${workflowLabel} is checking engine coherence.`,
    "Running field cartography across the reading.",
    "Arbitrating the pattern into one readable signal.",
    "Letting the structure settle before language.",
  ];
}

export function buildRitualLoadingMarkdown({
  commandTitle,
  workflowId,
  workflowName,
  routeLabel,
  contextQualityLabel,
  currentMessage,
  messages,
  subjectSummary,
}: {
  commandTitle: string;
  workflowId: string;
  workflowName: string;
  routeLabel: string;
  contextQualityLabel: string;
  currentMessage: string;
  messages: string[];
  subjectSummary?: string;
}): string {
  const lines = [
    `# ${getRitualProcessingTitle(commandTitle)}`,
    "",
    `${workflowName} is resolving the current pattern through ${routeLabel}.`,
    "",
    "## Current Step",
    "",
    currentMessage,
    "",
    "## Signal Path",
    "",
    ...messages.map((message) =>
      message === currentMessage ? `- **${message}**` : `- ${message}`,
    ),
    "",
    "## Context",
    "",
    `- Workflow: ${workflowName} (${workflowId})`,
    `- Route: ${routeLabel}`,
    `- Context Quality: ${contextQualityLabel}`,
    ...(subjectSummary ? [`- Subject: ${subjectSummary}`] : []),
  ];

  return lines.join("\n");
}
