import {
  EngineExecutionResult,
  ReadingSummary,
  WorkflowExecutionResult,
} from "./types";
import { getWitnessLayer, selectWitnessText } from "./witness-text";

const MAX_ARRAY_ITEMS = 8;
const MAX_OBJECT_DEPTH = 3;

export function buildEngineResultMarkdown(
  title: string,
  result: EngineExecutionResult,
  options: EngineResultPresentationOptions = {},
): string {
  const displayWitnessLayer = getDisplayWitnessLayer(result.witnessLayer);
  const lines = [
    `# ${title}`,
    "",
    ...(options.contextLines?.length ? [...options.contextLines, ""] : []),
    result.witnessPrompt ?? "_No witness response returned._",
    "",
  ];

  const heroSection = buildEngineHeroSection(result, 2);
  if (heroSection.length > 0) {
    lines.push(...heroSection, "");
  }

  if (Object.keys(displayWitnessLayer).length > 0) {
    lines.push(
      "## Witness Layer",
      "",
      ...buildStructuredBlock(displayWitnessLayer),
      "",
    );
  }

  lines.push("## Reading Brief", "", ...buildEngineHighlightLines(result));

  if (
    options.requestPayload &&
    Object.keys(options.requestPayload).length > 0
  ) {
    lines.push(
      "",
      "## Request Context",
      "",
      ...buildStructuredBlock(options.requestPayload),
    );
  }

  lines.push("", "## Result Map", "", ...buildEngineResultBlock(result, 3));

  const extraMetadata = stripPresentationMetadata(result.metadata);
  if (Object.keys(extraMetadata).length > 0) {
    lines.push(
      "",
      "## Response Metadata",
      "",
      ...buildStructuredBlock(extraMetadata),
    );
  }

  return compactMarkdown(lines).join("\n");
}

export function buildReadingResultMarkdown(
  reading: ReadingSummary,
  expanded = false,
): string {
  const normalized = toEngineExecutionResultFromReading(reading);

  return buildEngineResultMarkdown(
    truncate(normalized.witnessPrompt, expanded ? 120 : 60) ||
      humanizeKey(reading.engineId),
    normalized,
    {
      requestPayload: extractReadingRequestContext(reading.payload),
      contextLines: [formatReadingContextLine(reading)],
    },
  );
}

export function buildWorkflowResultMarkdown(
  title: string,
  result: WorkflowExecutionResult,
  requestPayload?: Record<string, unknown>,
): string {
  const engineIds = Object.keys(result.engineOutputs);
  const currentReadingLines = buildWorkflowCurrentReadingLines(result);
  const explicitOpening = getWorkflowExplicitOpeningResponse(result);
  const fallbackOpening = getWorkflowFallbackOpeningResponse(result);
  const fullReflection = getWorkflowFullReflection(result);
  const dyadLensLines = buildWorkflowDyadLensLines(result);
  const whyThisReadingLines = buildWorkflowWhyThisReadingLines(result);
  const effectiveRequestContext = getWorkflowRequestContext(
    result,
    requestPayload,
  );
  const lines = [
    `# ${title}`,
    "",
    result.timestamp
      ? `Completed ${formatAbsoluteTime(result.timestamp)}`
      : "Workflow complete.",
    "",
  ];

  if (currentReadingLines.length > 0) {
    lines.push(...currentReadingLines, "");
  } else if (explicitOpening) {
    lines.push(explicitOpening, "");
  } else if (fallbackOpening) {
    lines.push(fallbackOpening, "");
  }

  lines.push(
    "## Run Brief",
    "",
    ...buildWorkflowRunBriefLines(result, engineIds.length),
  );

  if (whyThisReadingLines.length > 0) {
    lines.push("", ...whyThisReadingLines);
  }

  if (dyadLensLines.length > 0) {
    lines.push("", "## Dyad Lens", "", ...dyadLensLines);
  }

  if (
    effectiveRequestContext &&
    Object.keys(effectiveRequestContext).length > 0
  ) {
    lines.push(
      "",
      "## Request Context",
      "",
      ...buildStructuredBlock(effectiveRequestContext),
    );
  }

  if (engineIds.length > 0) {
    lines.push("", "## Engine Outputs", "");

    for (const [engineId, output] of Object.entries(result.engineOutputs)) {
      const displayWitnessLayer = getDisplayWitnessLayer(output.witnessLayer, {
        stripNarrativeWhenPerspectives: true,
      });
      lines.push(`### ${humanizeKey(engineId)}`, "");

      if (shouldShowEngineOutputWitnessPrompt(output) && output.witnessPrompt) {
        lines.push(output.witnessPrompt, "");
      }

      const heroSection = buildEngineHeroSection(output, 4);
      if (heroSection.length > 0) {
        lines.push(...heroSection, "");
      }

      const outputBrief = [
        output.consciousnessLevel !== undefined
          ? `- Consciousness: ${output.consciousnessLevel}`
          : null,
        output.timestamp
          ? `- Timestamp: ${formatAbsoluteTime(output.timestamp)}`
          : null,
        readMetadataTime(output.metadata) !== undefined
          ? `- Calculation time: ${formatCalculationTime(readMetadataTime(output.metadata))}`
          : null,
      ].filter(Boolean) as string[];

      if (outputBrief.length > 0) {
        lines.push(...outputBrief, "");
      }

      if (Object.keys(displayWitnessLayer).length > 0) {
        lines.push(
          ...buildStructuredSection("Witness Layer", displayWitnessLayer, 4, 0),
          "",
        );
      }

      lines.push(...buildEngineOutputResultField(output, "Result", 2), "");
    }
  }

  if (fullReflection && currentReadingLines.length > 0) {
    lines.push("", "## Full Reflection", "", fullReflection);
  }

  return compactMarkdown(lines).join("\n");
}

export function summarizeWorkflowSubject(
  subject: unknown,
  maxLength = 180,
): string | undefined {
  if (typeof subject === "string" && subject.trim()) {
    return truncate(subject.trim(), maxLength);
  }

  const record = asRecord(subject);
  if (Object.keys(record).length === 0) {
    return undefined;
  }

  const explicitLabel =
    readString(record, "label") ??
    readString(record, "name") ??
    readString(record, "title") ??
    readString(record, "summary");
  if (explicitLabel) {
    return truncate(explicitLabel, maxLength);
  }

  const birthDate =
    readString(record, "birth_date") ?? readString(record, "date");
  const birthTime =
    readString(record, "birth_time") ?? readString(record, "time");
  const timezone = readString(record, "timezone");
  const locationLabel =
    readString(record, "location_label") ??
    readString(record, "location") ??
    readString(record, "place");
  const latitude = readNumber(record, "latitude");
  const longitude = readNumber(record, "longitude");
  const coordinateLabel =
    typeof latitude === "number" && typeof longitude === "number"
      ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
      : undefined;
  const subjectLine = [
    birthDate && birthTime
      ? `${birthDate} at ${birthTime}`
      : (birthDate ?? birthTime),
    timezone,
    locationLabel ?? coordinateLabel,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" · ");
  if (subjectLine) {
    return truncate(subjectLine, maxLength);
  }

  const preview = Object.entries(record)
    .flatMap(([key, value]) =>
      isInlineValue(value)
        ? [`${humanizeKey(key)}: ${formatInlineValue(value)}`]
        : [],
    )
    .slice(0, 4)
    .join(" · ");
  return preview ? truncate(preview, maxLength) : undefined;
}

export function listStructuredKeys(value: Record<string, unknown>): string[] {
  return Object.keys(value)
    .slice(0, 6)
    .map((key) => humanizeKey(key));
}

export function getReadingStructuredKeys(reading: ReadingSummary): string[] {
  return listStructuredKeys(toEngineExecutionResultFromReading(reading).result);
}

export function hasReadingRequestContext(reading: ReadingSummary): boolean {
  const requestPayload = extractReadingRequestContext(reading.payload);
  return Boolean(requestPayload && Object.keys(requestPayload).length > 0);
}

export function getReadingRequestJson(
  reading: ReadingSummary,
): string | undefined {
  const requestPayload = extractReadingRequestContext(reading.payload);
  return requestPayload && Object.keys(requestPayload).length > 0
    ? JSON.stringify(requestPayload, null, 2)
    : undefined;
}

function buildEngineHighlightLines(result: EngineExecutionResult): string[] {
  const payload = asRecord(result.result);
  const lines = [
    result.timestamp
      ? `- Completed: ${formatAbsoluteTime(result.timestamp)}`
      : null,
    result.consciousnessLevel !== undefined
      ? `- Consciousness: ${result.consciousnessLevel}`
      : null,
    readMetadataTime(result.metadata) !== undefined
      ? `- Calculation time: ${formatCalculationTime(readMetadataTime(result.metadata))}`
      : null,
    buildNestedLine(payload, ["current_organ", "organ"], "Current organ"),
    buildNestedLine(payload, ["current_dosha", "dosha"], "Current dosha"),
    buildNestedLine(payload, ["current_organ", "time_window"], "Active window"),
    buildNestedLine(
      payload,
      ["current_period", "mahadasha", "planet"],
      "Maha dasha",
    ),
    buildNestedLine(
      payload,
      ["current_period", "antardasha", "planet"],
      "Antar dasha",
    ),
    buildNestedLine(
      payload,
      ["current_period", "pratyantardasha", "planet"],
      "Praty dasha",
    ),
    typeof readNumber(payload, "overall_energy") === "number"
      ? `- Overall energy: ${Math.round(readNumber(payload, "overall_energy") ?? 0)}%`
      : null,
    ...buildNadabrahmanHighlightLines(result.engineId, payload),
    ...buildTarotHighlightLines(result.engineId, payload),
    pickSummaryLine(payload),
  ].filter(Boolean) as string[];

  if (lines.length > 0) {
    return lines;
  }

  const keys = Object.keys(payload);
  return keys.length > 0
    ? [
        `- Top-level result fields: ${keys.map((key) => `\`${key}\``).join(", ")}`,
      ]
    : ["- No structured result fields returned."];
}

function buildEngineHeroSection(
  result: EngineExecutionResult,
  headingLevel: number,
): string[] {
  const headingPrefix = "#".repeat(Math.max(2, Math.min(4, headingLevel)));
  const payload = asRecord(result.result);

  switch (result.engineId) {
    case "vedic-clock":
      return buildTableSection(
        `${headingPrefix} Current Pulse`,
        [
          ["Organ", readNestedString(payload, ["current_organ", "organ"])],
          ["Dosha", readNestedString(payload, ["current_dosha", "dosha"])],
          [
            "Window",
            readNestedString(payload, ["current_organ", "time_window"]),
          ],
          ["Element", readNestedString(payload, ["current_organ", "element"])],
        ],
        readString(asRecord(payload.recommendation), "time_window") ??
          readString(asRecord(payload.current_organ), "peak_energy") ??
          readString(payload, "synthesis"),
      );
    case "biorhythm":
      return buildTableSection(`${headingPrefix} Energy Signature`, [
        ["Overall", formatPercent(readNumber(payload, "overall_energy"))],
        ["Physical", summarizeCycleValue(asRecord(payload.physical))],
        ["Emotional", summarizeCycleValue(asRecord(payload.emotional))],
        ["Intellectual", summarizeCycleValue(asRecord(payload.intellectual))],
      ]);
    case "panchanga":
      return buildTableSection(`${headingPrefix} Panchanga Frame`, [
        ["Tithi", readString(payload, "tithi_name")],
        ["Nakshatra", readString(payload, "nakshatra_name")],
        ["Yoga", readString(payload, "yoga_name")],
        ["Vara", readString(payload, "vara_name")],
        ["Karana", readString(payload, "karana_name")],
      ]);
    case "transits":
      return buildTableSection(
        `${headingPrefix} Transit Weather`,
        [
          ["Quality", readString(payload, "period_quality")],
          [
            "Retrogrades",
            readStringArray(payload.retrograde_planets).join(", "),
          ],
          ["Aspects", formatCountValue(getRecordArray(payload.aspects).length)],
          ["Sade Sati", summarizeSadeSati(asRecord(payload.sade_sati))],
        ],
        readTransitAspectHeadline(payload),
      );
    case "vimshottari":
      return buildTableSection(
        `${headingPrefix} Dasha Focus`,
        [
          [
            "Maha",
            readNestedString(payload, [
              "current_period",
              "mahadasha",
              "planet",
            ]),
          ],
          [
            "Antar",
            readNestedString(payload, [
              "current_period",
              "antardasha",
              "planet",
            ]),
          ],
          [
            "Praty",
            readNestedString(payload, [
              "current_period",
              "pratyantardasha",
              "planet",
            ]),
          ],
          ["Next Shift", readUpcomingTransitionLabel(payload)],
        ],
        readString(asRecord(payload.period_enrichment), "combined_description"),
      );
    case "nadabrahman": {
      const timeRecommendation = asRecord(payload.time_recommendation);
      const primaryRaga = asRecord(timeRecommendation.primary_raga);
      const topRecommendation = getTopRecommendation(payload.recommendations);
      return buildTableSection(
        `${headingPrefix} Sonic Remedy`,
        [
          [
            "Primary Raga",
            readString(primaryRaga, "raga_name") ??
              readString(topRecommendation, "raga_name"),
          ],
          ["Prahar", readString(timeRecommendation, "prahar_name")],
          ["Window", readString(timeRecommendation, "time_range")],
          [
            "Dosha",
            humanizePhrase(
              readString(timeRecommendation, "dosha_dominance") ?? "",
            ),
          ],
          [
            "Energy",
            humanizePhrase(
              readString(timeRecommendation, "energy_quality") ?? "",
            ),
          ],
          ["Mood", humanizePhrase(readString(topRecommendation, "mood") ?? "")],
        ],
        readString(primaryRaga, "reason") ??
          readString(topRecommendation, "reason") ??
          readString(result.witnessLayer ?? {}, "response"),
      );
    }
    case "tarot": {
      const positions = getTarotPositions(payload);
      return buildTableSection(
        `${headingPrefix} Spread Overview`,
        [
          ["Spread", readNestedString(payload, ["spread", "name"])],
          [
            "Layout",
            humanizeTarotSpreadType(
              readNestedString(payload, ["spread", "type"]),
            ),
          ],
          [
            "Cards",
            positions.length > 0 ? String(positions.length) : undefined,
          ],
        ],
        readString(asRecord(payload.spread), "description"),
      );
    }
    default:
      return [];
  }
}

function buildNadabrahmanHighlightLines(
  engineId: string,
  payload: Record<string, unknown>,
): string[] {
  if (engineId !== "nadabrahman") {
    return [];
  }

  const lines: string[] = [];
  const timeRecommendation = asRecord(payload.time_recommendation);
  const primaryRaga = asRecord(timeRecommendation.primary_raga);
  const topRecommendation = getTopRecommendation(payload.recommendations);
  const qualities = readStringArray(
    topRecommendation.therapeutic_qualities,
  ).map((quality) => humanizePhrase(quality));

  const primaryName =
    readString(primaryRaga, "raga_name") ??
    readString(topRecommendation, "raga_name");
  if (primaryName) {
    lines.push(`- Primary raga: ${primaryName}`);
  }

  const prahar = readString(timeRecommendation, "prahar_name");
  const window = readString(timeRecommendation, "time_range");
  if (prahar || window) {
    lines.push(
      `- Listening window: ${[prahar, window].filter(Boolean).join(" · ")}`,
    );
  }

  const doshaDominance = readString(timeRecommendation, "dosha_dominance");
  if (doshaDominance) {
    lines.push(`- Dosha dominance: ${humanizePhrase(doshaDominance)}`);
  }

  const energyQuality = readString(timeRecommendation, "energy_quality");
  if (energyQuality) {
    lines.push(`- Energy quality: ${humanizePhrase(energyQuality)}`);
  }

  const mood = readString(topRecommendation, "mood");
  if (mood) {
    lines.push(`- Mood: ${humanizePhrase(mood)}`);
  }

  if (qualities.length > 0) {
    lines.push(`- Therapeutic qualities: ${qualities.join(", ")}`);
  }

  return lines;
}

function buildEngineResultBlock(
  result: EngineExecutionResult,
  headingLevel: number,
): string[] {
  switch (result.engineId) {
    case "biorhythm":
      return buildBiorhythmResultBlock(result.result, headingLevel);
    case "vedic-clock":
      return buildVedicClockResultBlock(result.result, headingLevel);
    case "panchanga":
      return buildPanchangaResultBlock(result.result, headingLevel);
    case "transits":
      return buildTransitsResultBlock(result.result, headingLevel);
    case "nadabrahman":
      return buildNadabrahmanResultBlock(result.result, headingLevel);
    case "tarot":
      return buildTarotResultBlock(result.result, headingLevel);
    default:
      return buildStructuredBlock(result.result);
  }
}

function buildEngineOutputResultField(
  result: EngineExecutionResult,
  label: string,
  depth: number,
): string[] {
  if (
    result.engineId === "biorhythm" ||
    result.engineId === "vedic-clock" ||
    result.engineId === "panchanga" ||
    result.engineId === "transits"
  ) {
    return [
      formatHeading(label, depth + 2),
      "",
      ...buildEngineResultBlock(result, depth + 3),
    ];
  }

  if (result.engineId === "nadabrahman") {
    return [
      formatHeading(label, depth + 2),
      "",
      ...buildNadabrahmanResultBlock(result.result, depth + 3),
    ];
  }

  if (result.engineId !== "tarot") {
    return buildStructuredSection(label, result.result, depth + 2, 0);
  }

  return [
    formatHeading(label, depth + 2),
    "",
    ...buildTarotResultBlock(result.result, depth + 3),
  ];
}

function shouldShowEngineOutputWitnessPrompt(
  result: EngineExecutionResult,
): boolean {
  return !["vedic-clock", "panchanga", "transits"].includes(result.engineId);
}

function buildTableSection(
  title: string,
  rows: Array<[string, string | undefined]>,
  note?: string,
): string[] {
  const visibleRows = rows.filter(
    ([, value]) => typeof value === "string" && value.trim().length > 0,
  ) as Array<[string, string]>;
  if (visibleRows.length === 0) {
    return [];
  }

  const lines = [title, "", "| Signal | Value |", "| --- | --- |"];
  visibleRows.forEach(([label, value]) => {
    lines.push(
      `| ${escapeTableCell(label)} | ${escapeTableCell(truncate(value, 120))} |`,
    );
  });

  if (note) {
    lines.push("", truncate(note, 220));
  }

  return lines;
}

function buildTableBlock(
  title: string,
  headingLevel: number,
  headers: string[],
  rows: Array<Array<string | undefined>>,
  options: {
    note?: string;
    limit?: number;
  } = {},
): string[] {
  const table = buildMarkdownTable(headers, rows, options.limit);
  if (table.length === 0) {
    return [];
  }

  return compactMarkdown([
    formatHeading(title, headingLevel),
    "",
    ...table,
    options.note ? "" : null,
    options.note ? truncate(options.note, 220) : null,
  ]);
}

function buildMarkdownTable(
  headers: string[],
  rows: Array<Array<string | undefined>>,
  limit = MAX_ARRAY_ITEMS,
): string[] {
  const normalizedRows = rows.filter((row) =>
    row.some((cell) => typeof cell === "string" && cell.trim().length > 0),
  );
  if (normalizedRows.length === 0) {
    return [];
  }

  const lines = [
    `| ${headers.map((header) => escapeTableCell(header)).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
  ];

  normalizedRows.slice(0, limit).forEach((row) => {
    const cells = headers.map((_, index) =>
      escapeTableCell(truncate(row[index] ?? "—", 120)),
    );
    lines.push(`| ${cells.join(" | ")} |`);
  });

  if (normalizedRows.length > limit) {
    lines.push("", `- ${normalizedRows.length - limit} more row(s) not shown.`);
  }

  return lines;
}

function readUpcomingTransitionLabel(
  payload: Record<string, unknown>,
): string | undefined {
  const transitions = payload.upcoming_transitions;
  if (!Array.isArray(transitions) || transitions.length === 0) {
    return undefined;
  }

  const first = asRecord(transitions[0]);
  const level = readString(first, "type");
  const daysUntil = readNumber(first, "days_until");
  const planet = readString(first, "to_planet");

  const parts = [
    level,
    typeof daysUntil === "number" ? `${Math.round(daysUntil)}d` : undefined,
    planet,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function buildVedicClockResultBlock(
  payload: Record<string, unknown>,
  headingLevel: number,
): string[] {
  const lines: string[] = [];
  const recommendation = asRecord(payload.recommendation);
  const nestedActivities = getRecordArray(recommendation.activities);
  const activities =
    nestedActivities.length > 0
      ? nestedActivities
      : getRecordArray(payload.recommendations);
  const transitions = getRecordArray(payload.upcoming_transitions);
  const timezone = asRecord(payload.timezone);

  const recommendationTable = buildTableBlock(
    "Recommended Activities",
    headingLevel,
    ["Activity", "Tone", "Reason"],
    activities.map((activity) => [
      readString(activity, "activity"),
      humanizeOptionalPhrase(readString(activity, "quality")),
      readString(activity, "reason"),
    ]),
    {
      limit: 5,
    },
  );
  if (recommendationTable.length > 0) {
    lines.push(...recommendationTable, "");
  }

  const transitionsTable = buildTableBlock(
    "Upcoming Transitions",
    headingLevel,
    ["Time", "Shift", "Description"],
    transitions.map((transition) => [
      readString(transition, "time"),
      [readString(transition, "new_dosha"), readString(transition, "new_organ")]
        .filter(Boolean)
        .join(" · "),
      readString(transition, "description"),
    ]),
    {
      limit: 6,
    },
  );
  if (transitionsTable.length > 0) {
    lines.push(...transitionsTable, "");
  }

  const timezoneTable = buildTableBlock(
    "Timezone Resolution",
    headingLevel,
    ["Signal", "Value"],
    [
      ["Local Hour", formatCountValue(readNumber(timezone, "local_hour"))],
      [
        "Offset Minutes",
        formatCountValue(readNumber(timezone, "offset_minutes")),
      ],
      ["Source", readString(timezone, "source")],
    ],
  );
  if (timezoneTable.length > 0) {
    lines.push(...timezoneTable);
  }

  return compactMarkdown(lines);
}

function buildBiorhythmResultBlock(
  payload: Record<string, unknown>,
  headingLevel: number,
): string[] {
  const lines: string[] = [];
  const forecast = getRecordArray(payload.forecast);
  const criticalDays = readStringArray(payload.critical_days);

  const cyclesTable = buildTableBlock(
    "Current Cycles",
    headingLevel,
    ["Cycle", "State", "Critical", "Peak"],
    [
      buildBiorhythmCycleRow("Physical", asRecord(payload.physical)),
      buildBiorhythmCycleRow("Emotional", asRecord(payload.emotional)),
      buildBiorhythmCycleRow("Intellectual", asRecord(payload.intellectual)),
      buildBiorhythmCycleRow("Intuitive", asRecord(payload.intuitive)),
      buildBiorhythmCycleRow("Spiritual", asRecord(payload.spiritual)),
      buildBiorhythmCycleRow("Aesthetic", asRecord(payload.aesthetic)),
    ],
    {
      limit: 6,
    },
  );
  if (cyclesTable.length > 0) {
    lines.push(...cyclesTable, "");
  }

  if (criticalDays.length > 0) {
    lines.push(
      formatHeading("Critical Window", headingLevel),
      "",
      `- ${criticalDays.join(", ")}`,
      "",
    );
  }

  const forecastTable = buildTableBlock(
    "Forecast",
    headingLevel,
    ["Date", "Overall", "Physical", "Spiritual", "Intuitive"],
    forecast.map((entry) => [
      readString(entry, "date"),
      formatPercent(readNumber(entry, "overall_energy")),
      formatPercent(readNumber(entry, "physical")),
      formatPercent(readNumber(entry, "spiritual")),
      formatPercent(readNumber(entry, "intuitive")),
    ]),
    {
      limit: 7,
    },
  );
  if (forecastTable.length > 0) {
    lines.push(...forecastTable);
  }

  return compactMarkdown(lines);
}

function buildPanchangaResultBlock(
  payload: Record<string, unknown>,
  headingLevel: number,
): string[] {
  const lines: string[] = [];

  const frameTable = buildTableBlock(
    "Panchanga Table",
    headingLevel,
    ["Factor", "Name", "Index", "Value"],
    [
      [
        "Tithi",
        readString(payload, "tithi_name"),
        formatCountValue(readNumber(payload, "tithi_index")),
        formatDecimalValue(readNumber(payload, "tithi_value"), 2),
      ],
      [
        "Nakshatra",
        readString(payload, "nakshatra_name"),
        formatCountValue(readNumber(payload, "nakshatra_index")),
        formatDecimalValue(readNumber(payload, "nakshatra_value"), 2),
      ],
      [
        "Yoga",
        readString(payload, "yoga_name"),
        formatCountValue(readNumber(payload, "yoga_index")),
        formatDecimalValue(readNumber(payload, "yoga_value"), 2),
      ],
      [
        "Vara",
        readString(payload, "vara_name"),
        formatCountValue(readNumber(payload, "vara_index")),
        undefined,
      ],
      [
        "Karana",
        readString(payload, "karana_name"),
        formatCountValue(readNumber(payload, "karana_index")),
        formatDecimalValue(readNumber(payload, "karana_value"), 2),
      ],
    ],
    {
      limit: 5,
    },
  );
  if (frameTable.length > 0) {
    lines.push(...frameTable, "");
  }

  const anglesTable = buildTableBlock(
    "Astronomical Angles",
    headingLevel,
    ["Signal", "Value"],
    [
      [
        "Solar Longitude",
        formatDecimalValue(readNumber(payload, "solar_longitude"), 3),
      ],
      [
        "Lunar Longitude",
        formatDecimalValue(readNumber(payload, "lunar_longitude"), 3),
      ],
      ["Julian Day", formatDecimalValue(readNumber(payload, "julian_day"), 3)],
    ],
  );
  if (anglesTable.length > 0) {
    lines.push(...anglesTable);
  }

  return compactMarkdown(lines);
}

function buildTransitsResultBlock(
  payload: Record<string, unknown>,
  headingLevel: number,
): string[] {
  const lines: string[] = [];
  const aspects = getRecordArray(payload.aspects);
  const transitPositions = getRecordArray(payload.transit_positions);
  const natalPositions = getRecordArray(payload.natal_positions);

  const aspectsTable = buildTableBlock(
    "Key Aspects",
    headingLevel,
    ["Transit", "Aspect", "Natal", "Orb", "Nature"],
    aspects.map((aspect) => [
      readString(aspect, "transiting_planet"),
      readString(aspect, "aspect_type"),
      readString(aspect, "natal_planet"),
      formatOrb(readNumber(aspect, "orb")),
      readString(aspect, "nature"),
    ]),
    {
      limit: 8,
    },
  );
  if (aspectsTable.length > 0) {
    lines.push(...aspectsTable, "");
  }

  const currentSkyTable = buildTableBlock(
    "Current Sky",
    headingLevel,
    ["Planet", "Sign", "Degree", "Speed", "Motion"],
    transitPositions.map((position) => [
      readString(position, "planet"),
      readString(position, "sign"),
      formatDecimalValue(readNumber(position, "degree_in_sign"), 2),
      formatDecimalValue(readNumber(position, "speed"), 4),
      readBoolean(position, "is_retrograde") ? "Retrograde" : "Direct",
    ]),
    {
      limit: 12,
    },
  );
  if (currentSkyTable.length > 0) {
    lines.push(...currentSkyTable, "");
  }

  const natalTable = buildTableBlock(
    "Natal Anchors",
    headingLevel,
    ["Planet", "Sign", "Degree", "Motion"],
    natalPositions.map((position) => [
      readString(position, "planet"),
      readString(position, "sign"),
      formatDecimalValue(readNumber(position, "degree_in_sign"), 2),
      readBoolean(position, "is_retrograde") ? "Retrograde" : "Direct",
    ]),
    {
      limit: 12,
    },
  );
  if (natalTable.length > 0) {
    lines.push(...natalTable);
  }

  return compactMarkdown(lines);
}

function summarizeCycleValue(
  cycle: Record<string, unknown>,
): string | undefined {
  if (Object.keys(cycle).length === 0) {
    return undefined;
  }

  const phase = readString(cycle, "phase");
  const percentage = formatPercent(readNumber(cycle, "percentage"));
  return (
    [phase, percentage !== "--" ? percentage : undefined]
      .filter(Boolean)
      .join(" · ") || undefined
  );
}

function formatPercent(value: number | undefined): string {
  return typeof value === "number" ? `${Math.round(value)}%` : "--";
}

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, "\\|");
}

function toEngineExecutionResultFromReading(
  reading: ReadingSummary,
): EngineExecutionResult {
  const payload = asRecord(reading.payload);
  const rawMetadata = asRecord(payload.metadata);
  const resultRecord = extractReadingResultRecord(payload);

  return {
    engineId: reading.engineId,
    result: resultRecord,
    witnessPrompt: reading.witnessPrompt ?? selectWitnessText(payload),
    witnessLayer: getWitnessLayer(payload),
    consciousnessLevel:
      reading.consciousnessLevel ?? readNumber(payload, "consciousness_level"),
    metadata: {
      ...rawMetadata,
      ...(reading.calculationTimeMs !== undefined
        ? { calculation_time_ms: reading.calculationTimeMs }
        : {}),
    },
    timestamp:
      readString(payload, "timestamp") ??
      readString(payload, "created_at") ??
      reading.createdAt,
    raw: payload,
  };
}

function extractReadingResultRecord(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const directResult = asRecord(payload.result);
  if (Object.keys(directResult).length > 0) {
    return directResult;
  }

  const resultData = asRecord(payload.result_data);
  if (Object.keys(resultData).length > 0) {
    return resultData;
  }

  const ignoredKeys = new Set([
    "id",
    "engine_id",
    "workflow_id",
    "input_hash",
    "witness_prompt",
    "consciousness_level",
    "calculation_time_ms",
    "created_at",
    "fetched_at",
    "metadata",
    "timestamp",
    "witness_layer",
    "result",
    "result_data",
    "birth_data",
    "current_time",
    "precision",
    "options",
    "input",
    "input_data",
  ]);

  return Object.fromEntries(
    Object.entries(payload).filter(([key]) => !ignoredKeys.has(key)),
  );
}

function extractReadingRequestContext(
  payloadValue: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const payload = asRecord(payloadValue);

  const directInput = asRecord(payload.input);
  if (Object.keys(directInput).length > 0) {
    return directInput;
  }

  const inputData = asRecord(payload.input_data);
  if (Object.keys(inputData).length > 0) {
    return inputData;
  }

  const birthData = asRecord(payload.birth_data);
  const options = asRecord(payload.options);
  const currentTime = readString(payload, "current_time");
  const precision = readString(payload, "precision");

  const requestPayload = {
    ...(Object.keys(birthData).length > 0 ? { birth_data: birthData } : {}),
    ...(currentTime ? { current_time: currentTime } : {}),
    ...(precision ? { precision } : {}),
    ...(Object.keys(options).length > 0 ? { options } : {}),
  };

  return Object.keys(requestPayload).length > 0 ? requestPayload : undefined;
}

function buildWorkflowCurrentReadingLines(
  result: WorkflowExecutionResult,
): string[] {
  const witnessLayer = getWorkflowWitnessLayer(result);
  const title = readString(witnessLayer, "title");
  const summary = normalizeWorkflowSummary(readString(witnessLayer, "summary"));
  const practice = readStringArray(witnessLayer.practice);
  const convergences = readStringArray(witnessLayer.convergences);
  const frictions = readStringArray(witnessLayer.frictions);
  const question = readString(witnessLayer, "question");
  const explicitOpening = getWorkflowExplicitOpeningResponse(result);

  if (
    !title &&
    !summary &&
    practice.length === 0 &&
    convergences.length === 0 &&
    frictions.length === 0 &&
    !question
  ) {
    return [];
  }

  const lines: string[] = ["## Current Reading", ""];

  if (title) {
    lines.push(`### ${title}`, "");
  }

  if (summary) {
    lines.push(summary, "");
  }

  if (
    explicitOpening &&
    explicitOpening !== title &&
    explicitOpening !== summary
  ) {
    lines.push(explicitOpening, "");
  }

  if (convergences.length > 0) {
    lines.push(
      "### Convergences",
      "",
      ...convergences.map((item) => `- ${item}`),
      "",
    );
  }

  if (frictions.length > 0) {
    lines.push(
      "### Frictions",
      "",
      ...frictions.map((item) => `- ${item}`),
      "",
    );
  }

  if (practice.length > 0) {
    lines.push("### Practice", "", ...practice.map((item) => `- ${item}`), "");
  }

  if (question) {
    lines.push("### Reflection Question", "", question);
  }

  return compactMarkdown(lines);
}

function getWorkflowExplicitOpeningResponse(
  result: WorkflowExecutionResult,
): string | undefined {
  const report = getWorkflowReport(result);
  return (
    readString(report, "opening_response") ??
    readString(report, "openingResponse") ??
    readString(result.raw, "opening_response") ??
    readString(result.raw, "openingResponse") ??
    selectWitnessText(asRecord(report.opening_response)) ??
    selectWitnessText(asRecord(report.openingResponse))
  );
}

function getWorkflowFallbackOpeningResponse(
  result: WorkflowExecutionResult,
): string | undefined {
  return selectWitnessText(result.synthesis) ?? selectWitnessText(result.raw);
}

function getWorkflowFullReflection(
  result: WorkflowExecutionResult,
): string | undefined {
  const witnessLayer = getWorkflowWitnessLayer(result);
  const explicitOpening = getWorkflowExplicitOpeningResponse(result);
  const reflection =
    readString(witnessLayer, "response") ??
    readString(witnessLayer, "synthesis") ??
    getWorkflowFallbackOpeningResponse(result);

  return reflection && reflection !== explicitOpening ? reflection : undefined;
}

function buildWorkflowRunBriefLines(
  result: WorkflowExecutionResult,
  engineOutputCount: number,
): string[] {
  const subjectSummary = summarizeWorkflowSubject(
    result.subject ?? result.raw.subject,
    180,
  );
  const lines = [
    `- Engine outputs returned: ${engineOutputCount}`,
    `- Total time: ${formatCalculationTime(result.totalTimeMs)}`,
    result.readingId ? `- Reading ID: ${result.readingId}` : null,
    result.createdAt
      ? `- Created: ${formatAbsoluteTime(result.createdAt)}`
      : null,
    subjectSummary ? `- Subject: ${subjectSummary}` : null,
  ].filter(Boolean) as string[];

  const runBrief = getWorkflowRunBrief(result);
  if (Object.keys(runBrief).length > 0) {
    lines.push(...buildStructuredBlock(runBrief));
  }

  const synthesisSummary = pickSummaryString(
    getWorkflowSynthesisSection(result),
  );
  if (
    synthesisSummary &&
    !lines.some((line) => line.includes(synthesisSummary))
  ) {
    lines.push(`- Synthesis: ${synthesisSummary}`);
  }

  return compactMarkdown(lines);
}

function buildWorkflowWhyThisReadingLines(
  result: WorkflowExecutionResult,
): string[] {
  const evidence = getWorkflowEvidence(result);
  if (evidence === undefined) {
    return [];
  }

  const evidenceRecord = asRecord(evidence);
  const contributions = getRecordArray(evidenceRecord.contributions);
  const inputsUsed = getWorkflowEvidenceInputLabels(evidence);
  const evidenceDetails = getWorkflowEvidenceDetails(evidence);

  if (contributions.length === 0) {
    if (inputsUsed.length === 0 && Object.keys(evidenceDetails).length === 0) {
      return buildStructuredSection("Evidence", evidence, 2, 0);
    }

    return compactMarkdown(
      [
        "## Why This Reading",
        "",
        inputsUsed.length > 0
          ? `- Inputs: ${formatLimitedList(inputsUsed, MAX_ARRAY_ITEMS)}`
          : null,
        Object.keys(evidenceDetails).length > 0 ? "" : null,
        Object.keys(evidenceDetails).length > 0
          ? buildStructuredSection("Evidence Details", evidenceDetails, 3, 0)
          : null,
      ].flat(),
    );
  }

  const lines = ["## Why This Reading", ""];

  if (inputsUsed.length > 0) {
    lines.push(
      `- Inputs: ${formatLimitedList(inputsUsed, MAX_ARRAY_ITEMS)}`,
      "",
    );
  }

  lines.push(
    ...buildMarkdownTable(
      ["Input", "Signal", "Impact"],
      contributions.map((contribution) => [
        humanizeKey(readString(contribution, "engine_id") ?? "input"),
        summarizeNarrativeField(readString(contribution, "signal"), 120),
        summarizeNarrativeField(readString(contribution, "impact"), 120),
      ]),
      6,
    ),
  );

  return compactMarkdown(lines);
}

function getWorkflowEvidenceInputLabels(evidence: unknown): string[] {
  const evidenceRecord = asRecord(evidence);
  const rawInputs = [
    ...readStringArray(evidenceRecord.engines_used),
    ...readStringArray(evidenceRecord.engine_ids),
    ...readStringArray(evidenceRecord.engines),
    ...readStringArray(evidenceRecord.inputs),
    ...(Array.isArray(evidence) ? readStringArray(evidence) : []),
  ];
  const seen = new Set<string>();

  return rawInputs
    .map((input) => humanizeKey(input))
    .filter((input) => {
      const key = input.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

function getWorkflowEvidenceDetails(
  evidence: unknown,
): Record<string, unknown> {
  const details = { ...asRecord(evidence) };
  delete details.contributions;
  delete details.engines_used;
  delete details.engine_ids;
  delete details.engines;
  delete details.inputs;
  return compactRecord(details);
}

function buildWorkflowDyadLensLines(result: WorkflowExecutionResult): string[] {
  const lines: string[] = [];
  const synthesis = getWorkflowSynthesisSection(result);
  const aletheios = getWorkflowAgentSection(result, "aletheios");
  const pichet = getWorkflowAgentSection(result, "pichet");
  const progression = getWorkflowProgressionMetadata(result);

  if (Object.keys(synthesis).length > 0) {
    lines.push(...buildStructuredSection("Synthesis", synthesis, 3, 0), "");
  }

  if (Object.keys(aletheios).length > 0) {
    lines.push(...buildStructuredSection("Aletheios", aletheios, 3, 0), "");
  }

  if (Object.keys(pichet).length > 0) {
    lines.push(...buildStructuredSection("Pichet", pichet, 3, 0), "");
  }

  if (Object.keys(progression).length > 0) {
    lines.push(
      ...buildStructuredSection("Progression Metadata", progression, 3, 0),
      "",
    );
  }

  return compactMarkdown(lines);
}

function getWorkflowSynthesisSection(
  result: WorkflowExecutionResult,
): Record<string, unknown> {
  const report = getWorkflowReport(result);
  const reportDyadLens = asRecord(report.dyad_lens);
  const reportSynthesis = reportDyadLens.synthesis;

  if (isRecord(reportSynthesis)) {
    return stripWorkflowSynthesisFields(reportSynthesis);
  }

  if (typeof reportSynthesis === "string" && reportSynthesis.trim()) {
    return { summary: reportSynthesis };
  }

  const direct = stripWorkflowSynthesisFields(result.synthesis);
  if (Object.keys(direct).length > 0) {
    return direct;
  }

  const witnessLayer = getWorkflowWitnessLayer(result);
  return compactRecord({
    summary:
      normalizeWorkflowSummary(readString(witnessLayer, "summary")) ??
      summarizeNarrativeField(readString(witnessLayer, "synthesis"), 220) ??
      summarizeNarrativeField(readString(witnessLayer, "response"), 220) ??
      readString(result.raw, "subject"),
  });
}

function getWorkflowAgentSection(
  result: WorkflowExecutionResult,
  key: "aletheios" | "pichet",
): Record<string, unknown> {
  const report = getWorkflowReport(result);
  const reportDyadLens = asRecord(report.dyad_lens);
  const reportAgent = filterWorkflowAgentSection(asRecord(reportDyadLens[key]));
  if (Object.keys(reportAgent).length > 0) {
    return reportAgent;
  }

  const witnessLayer = getWorkflowWitnessLayer(result);
  const witnessAgent = filterWorkflowAgentSection(asRecord(witnessLayer[key]));
  if (Object.keys(witnessAgent).length > 0) {
    return witnessAgent;
  }

  return filterWorkflowAgentSection(asRecord(result.synthesis[key]));
}

function getWorkflowProgressionMetadata(
  result: WorkflowExecutionResult,
): Record<string, unknown> {
  const witnessLayer = getWorkflowWitnessLayer(result);

  return compactRecord({
    decoder_state: asRecord(witnessLayer.decoder_state),
    max_layer_unlocked: witnessLayer.max_layer_unlocked,
    clifford_level: witnessLayer.clifford_level,
    kosha_depth: witnessLayer.kosha_depth,
  });
}

function getWorkflowEvidence(result: WorkflowExecutionResult): unknown {
  const report = getWorkflowReport(result);
  return report.evidence ?? result.evidence;
}

function getWorkflowRequestContext(
  result: WorkflowExecutionResult,
  requestPayload?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const report = getWorkflowReport(result);
  const reportContext = asRecord(report.request_context);
  const reportRequestContext =
    Object.keys(reportContext).length > 0
      ? reportContext
      : asRecord(result.raw.request_context);

  if (requestPayload && Object.keys(requestPayload).length > 0) {
    return {
      ...reportRequestContext,
      ...requestPayload,
    };
  }

  if (Object.keys(reportRequestContext).length > 0) {
    return reportRequestContext;
  }

  const subjectContext = asRecord(result.subject ?? result.raw.subject);
  if (Object.keys(subjectContext).length > 0) {
    return subjectContext;
  }

  return undefined;
}

function getWorkflowRunBrief(
  result: WorkflowExecutionResult,
): Record<string, unknown> {
  const report = getWorkflowReport(result);
  return compactRecord({
    ...asRecord(report.run_brief),
    ...asRecord(result.raw.run_brief),
  });
}

function getWorkflowReport(
  result: WorkflowExecutionResult,
): Record<string, unknown> {
  return result.report ?? asRecord(result.raw.report);
}

function getWorkflowWitnessLayer(
  result: WorkflowExecutionResult,
): Record<string, unknown> {
  return getWitnessLayer(result.synthesis) ?? getWitnessLayer(result.raw) ?? {};
}

function getDisplayWitnessLayer(
  witnessLayerValue: Record<string, unknown> | undefined,
  options: {
    stripNarrativeWhenPerspectives?: boolean;
  } = {},
): Record<string, unknown> {
  const witnessLayer = asRecord(witnessLayerValue);
  const aletheios = asRecord(witnessLayer.aletheios);
  const pichet = asRecord(witnessLayer.pichet);
  const filteredAletheios = compactRecord({
    perspective: summarizeNarrativeField(
      readString(aletheios, "perspective"),
      220,
    ),
    pattern_note: summarizeNarrativeField(
      readString(aletheios, "pattern_note"),
      180,
    ),
  });
  const filteredPichet = compactRecord({
    perspective: summarizeNarrativeField(
      readString(pichet, "perspective"),
      220,
    ),
    somatic_note: summarizeNarrativeField(
      readString(pichet, "somatic_note"),
      180,
    ),
  });
  const includeNarrative =
    !options.stripNarrativeWhenPerspectives ||
    (Object.keys(filteredAletheios).length === 0 &&
      Object.keys(filteredPichet).length === 0);

  return compactRecord({
    response: includeNarrative
      ? summarizeNarrativeField(readString(witnessLayer, "response"), 220)
      : undefined,
    synthesis: includeNarrative
      ? summarizeNarrativeField(readString(witnessLayer, "synthesis"), 220)
      : undefined,
    aletheios: filteredAletheios,
    pichet: filteredPichet,
    inference: summarizeWitnessInference(asRecord(witnessLayer.inference)),
  });
}

function normalizeWorkflowSummary(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  return /^[-–—\s]+$/.test(trimmed) ? undefined : trimmed;
}

function stripWorkflowSynthesisFields(value: unknown): Record<string, unknown> {
  const record = { ...asRecord(value) };
  delete record.witness_layer;
  delete record.aletheios;
  delete record.pichet;
  delete record.report;
  return compactRecord(record);
}

function formatReadingContextLine(reading: ReadingSummary): string {
  return [reading.engineId, reading.workflowId].filter(Boolean).join(" · ");
}

function pickSummaryLine(payload: Record<string, unknown>): string | null {
  const candidate =
    selectWitnessText(payload) ??
    readString(payload, "summary") ??
    readString(asRecord(payload.period_enrichment), "combined_description") ??
    readString(asRecord(payload.recommendation), "time_window");

  return candidate ? `- Summary: ${truncate(candidate, 180)}` : null;
}

function buildStructuredBlock(value: unknown): string[] {
  if (isRecord(value)) {
    return buildStructuredObject(value, 0, 3);
  }

  if (Array.isArray(value)) {
    return buildStructuredArray("Items", value, 0, 3);
  }

  return [`- ${formatInlineValue(value)}`];
}

function buildStructuredObject(
  record: Record<string, unknown>,
  depth: number,
  nestedHeadingLevel: number,
): string[] {
  const primitiveEntries: Array<[string, unknown]> = [];
  const nestedEntries: Array<[string, unknown]> = [];

  for (const [key, value] of Object.entries(record)) {
    if (isInlineValue(value)) {
      primitiveEntries.push([key, value]);
    } else {
      nestedEntries.push([key, value]);
    }
  }

  const lines: string[] = [];

  if (primitiveEntries.length === 0 && nestedEntries.length === 0) {
    return ["- No structured fields returned."];
  }

  for (const [key, value] of primitiveEntries) {
    lines.push(`- ${humanizeKey(key)}: ${formatInlineValue(value)}`);
  }

  for (const [key, value] of nestedEntries) {
    if (depth >= MAX_OBJECT_DEPTH) {
      lines.push(`- ${humanizeKey(key)}: ${buildValuePreview(value)}`);
      continue;
    }

    lines.push(
      "",
      ...buildStructuredSection(
        humanizeKey(key),
        value,
        nestedHeadingLevel,
        depth + 1,
      ),
    );
  }

  return compactMarkdown(lines);
}

function buildNadabrahmanResultBlock(
  payload: Record<string, unknown>,
  headingLevel: number,
): string[] {
  const lines: string[] = [];
  const timeRecommendation = asRecord(payload.time_recommendation);
  const primaryRaga = asRecord(timeRecommendation.primary_raga);
  const recommendations = getRecommendationRecords(payload.recommendations);

  if (Object.keys(timeRecommendation).length > 0) {
    lines.push(
      formatHeading("Time Recommendation", headingLevel),
      "",
      ...compactMarkdown([
        readString(timeRecommendation, "dosha_dominance")
          ? `- Dosha Dominance: ${humanizePhrase(readString(timeRecommendation, "dosha_dominance") ?? "")}`
          : null,
        readString(timeRecommendation, "energy_quality")
          ? `- Energy Quality: ${humanizePhrase(readString(timeRecommendation, "energy_quality") ?? "")}`
          : null,
        readString(timeRecommendation, "prahar_name")
          ? `- Prahar Name: ${readString(timeRecommendation, "prahar_name")}`
          : null,
        typeof readNumber(timeRecommendation, "prahar_number") === "number"
          ? `- Prahar Number: ${readNumber(timeRecommendation, "prahar_number")}`
          : null,
        readString(timeRecommendation, "time_range")
          ? `- Time Range: ${readString(timeRecommendation, "time_range")}`
          : null,
      ]),
    );

    if (Object.keys(primaryRaga).length > 0) {
      lines.push(
        "",
        formatHeading("Primary Raga", headingLevel + 1),
        "",
        ...compactMarkdown([
          readString(primaryRaga, "raga_name")
            ? `- Raga Name: ${readString(primaryRaga, "raga_name")}`
            : null,
          typeof readNumber(primaryRaga, "raga_number") === "number"
            ? `- Raga Number: ${readNumber(primaryRaga, "raga_number")}`
            : null,
          readString(primaryRaga, "reason")
            ? `- Reason: ${readString(primaryRaga, "reason")}`
            : null,
        ]),
      );
    }
  }

  if (recommendations.length > 0) {
    lines.push("", formatHeading("Recommendations", headingLevel), "");

    recommendations.forEach((recommendation, index) => {
      lines.push(
        `**Recommendation ${index + 1}**`,
        ...compactMarkdown([
          readString(recommendation, "raga_name")
            ? `- Raga Name: ${readString(recommendation, "raga_name")}`
            : null,
          typeof readNumber(recommendation, "raga_number") === "number"
            ? `- Raga Number: ${readNumber(recommendation, "raga_number")}`
            : null,
          readString(recommendation, "mood")
            ? `- Mood: ${humanizePhrase(readString(recommendation, "mood") ?? "")}`
            : null,
          typeof readNumber(recommendation, "score") === "number"
            ? `- Score: ${readNumber(recommendation, "score")}`
            : null,
          readString(recommendation, "reason")
            ? `- Reason: ${readString(recommendation, "reason")}`
            : null,
          formatJoinedStringLine(
            "Therapeutic Qualities",
            readStringArray(recommendation.therapeutic_qualities).map(
              (quality) => humanizePhrase(quality),
            ),
          ),
          formatJoinedStringLine(
            "Arohanam",
            readStringArray(recommendation.arohanam),
          ),
          formatJoinedStringLine(
            "Avarohanam",
            readStringArray(recommendation.avarohanam),
          ),
        ]),
      );

      if (index < recommendations.length - 1) {
        lines.push("");
      }
    });
  }

  return compactMarkdown(lines);
}

function buildStructuredSection(
  label: string,
  value: unknown,
  headingLevel: number,
  structureDepth: number,
): string[] {
  const heading = formatHeading(label, headingLevel);

  if (Array.isArray(value)) {
    return [
      heading,
      "",
      ...buildStructuredArray(label, value, structureDepth, headingLevel + 1),
    ];
  }

  if (isRecord(value)) {
    return [
      heading,
      "",
      ...buildStructuredObject(value, structureDepth, headingLevel + 1),
    ];
  }

  return [heading, "", `- ${formatInlineValue(value)}`];
}

function buildStructuredArray(
  label: string,
  items: unknown[],
  depth: number,
  nestedHeadingLevel: number,
): string[] {
  if (items.length === 0) {
    return ["- No items returned."];
  }

  if (items.every((item) => isInlineValue(item))) {
    return items
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => `- ${formatInlineValue(item)}`)
      .concat(
        items.length > MAX_ARRAY_ITEMS
          ? [`- ${items.length - MAX_ARRAY_ITEMS} more item(s) not shown.`]
          : [],
      );
  }

  const lines: string[] = [];
  const visibleItems = items.slice(0, MAX_ARRAY_ITEMS);

  visibleItems.forEach((item, index) => {
    const itemLabel = singularize(label);
    lines.push(`**${itemLabel} ${index + 1}**`);

    if (isRecord(item)) {
      lines.push(...buildStructuredObject(item, depth + 1, nestedHeadingLevel));
    } else if (Array.isArray(item)) {
      lines.push(
        ...buildStructuredArray(itemLabel, item, depth + 1, nestedHeadingLevel),
      );
    } else {
      lines.push(`- ${formatInlineValue(item)}`);
    }

    if (index < visibleItems.length - 1) {
      lines.push("");
    }
  });

  if (items.length > MAX_ARRAY_ITEMS) {
    lines.push(
      "",
      `- ${items.length - MAX_ARRAY_ITEMS} more item(s) not shown.`,
    );
  }

  return compactMarkdown(lines);
}

function buildTarotResultBlock(
  payload: Record<string, unknown>,
  headingLevel: number,
): string[] {
  const lines: string[] = [];
  const spread = asRecord(payload.spread);
  const positions = getTarotPositions(payload);
  const question = readString(payload, "question");

  if (question) {
    lines.push(`- Question: ${truncate(question, 220)}`);
  }

  if (Object.keys(spread).length > 0 || positions.length > 0) {
    lines.push(
      "",
      formatHeading("Spread", headingLevel),
      "",
      ...buildTarotSpreadLines(spread, positions.length),
    );
  }

  if (positions.length > 0) {
    lines.push("", formatHeading("Cards Drawn", headingLevel), "");

    positions.forEach((position, index) => {
      lines.push(...buildTarotPositionLines(position, index, headingLevel + 1));

      if (index < positions.length - 1) {
        lines.push("");
      }
    });
  }

  const extraFields = { ...payload };
  delete extraFields.positions;
  delete extraFields.question;
  delete extraFields.spread;

  if (Object.keys(extraFields).length > 0) {
    lines.push(
      "",
      formatHeading("Additional Fields", headingLevel),
      "",
      ...buildStructuredObject(
        extraFields,
        Math.max(0, headingLevel - 2),
        headingLevel + 1,
      ),
    );
  }

  return compactMarkdown(lines);
}

function buildTarotSpreadLines(
  spread: Record<string, unknown>,
  positionCount: number,
): string[] {
  const lines: string[] = [];
  const spreadName = readString(spread, "name");
  const spreadType = readString(spread, "type");
  const description = readString(spread, "description");

  if (spreadName) {
    lines.push(`- Name: ${spreadName}`);
  }

  if (spreadType) {
    lines.push(`- Layout: ${humanizeTarotSpreadType(spreadType)}`);
  }

  if (positionCount > 0) {
    lines.push(`- Cards drawn: ${positionCount}`);
  }

  if (description) {
    lines.push(`- Description: ${truncate(description, 220)}`);
  }

  return lines.length > 0 ? lines : ["- Spread metadata unavailable."];
}

function buildTarotPositionLines(
  position: Record<string, unknown>,
  index: number,
  headingLevel: number,
): string[] {
  const card = asRecord(position.card);
  const interpretation = asRecord(card.interpretation);
  const keywords = readStringArray(interpretation.keywords);
  const lines = [
    formatHeading(
      `${index + 1}. ${readString(position, "name") ?? `Card ${index + 1}`}`,
      headingLevel,
    ),
    "",
  ];
  const cardName = readString(card, "name");
  const orientation =
    typeof card.isReversed === "boolean"
      ? card.isReversed
        ? "Reversed"
        : "Upright"
      : undefined;
  const arcana = readString(card, "arcana");
  const element = readString(card, "element");
  const suit = readString(card, "suit");
  const role = readString(position, "meaning");
  const message = readString(interpretation, "meaning");

  if (cardName) {
    lines.push(`- Card: ${cardName}`);
  }

  if (orientation) {
    lines.push(`- Orientation: ${orientation}`);
  }

  if (role) {
    lines.push(`- Role: ${truncate(role, 220)}`);
  }

  if (arcana) {
    lines.push(`- Arcana: ${humanizeKey(arcana)}`);
  }

  if (element) {
    lines.push(`- Element: ${humanizeKey(element)}`);
  }

  if (suit) {
    lines.push(`- Suit: ${humanizeKey(suit)}`);
  }

  if (message) {
    lines.push(`- Message: ${truncate(message, 220)}`);
  }

  if (keywords.length > 0) {
    lines.push(
      `- Keywords: ${keywords.map((keyword) => humanizePhrase(keyword)).join(", ")}`,
    );
  }

  if (lines.length === 2) {
    lines.push("- No card details returned.");
  }

  return lines;
}

function buildTarotHighlightLines(
  engineId: string,
  payload: Record<string, unknown>,
): string[] {
  if (engineId !== "tarot") {
    return [];
  }

  const lines: string[] = [];
  const spreadName = readNestedString(payload, ["spread", "name"]);
  const positions = getTarotPositions(payload);

  if (spreadName) {
    lines.push(`- Spread: ${spreadName}`);
  }

  if (positions.length > 0) {
    lines.push(`- Cards drawn: ${positions.length}`);
  }

  return lines;
}

function getTarotPositions(
  payload: Record<string, unknown>,
): Array<Record<string, unknown>> {
  const positions = payload.positions;
  if (!Array.isArray(positions)) {
    return [];
  }

  return positions
    .map((entry) => asRecord(entry))
    .filter((entry) => Object.keys(entry).length > 0);
}

function buildNestedLine(
  payload: Record<string, unknown>,
  path: string[],
  label: string,
): string | null {
  const value = readNestedString(payload, path);
  return value ? `- ${label}: ${truncate(value, 180)}` : null;
}

function readNestedString(
  payload: Record<string, unknown>,
  path: string[],
): string | undefined {
  let current: unknown = payload;

  for (const segment of path) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[segment];
  }

  return typeof current === "string" && current.trim() ? current : undefined;
}

function readNumber(
  payload: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function readBoolean(
  payload: Record<string, unknown>,
  key: string,
): boolean | undefined {
  const value = payload[key];
  return typeof value === "boolean" ? value : undefined;
}

function readString(
  payload: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function getRecordArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => asRecord(entry))
    .filter((entry) => Object.keys(entry).length > 0);
}

function readMetadataTime(
  metadata: Record<string, unknown>,
): number | undefined {
  const direct = metadata.calculation_time_ms;
  return typeof direct === "number" ? direct : undefined;
}

function stripPresentationMetadata(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const rest = { ...metadata };
  delete rest.calculation_time_ms;
  return rest;
}

function pickSummaryString(
  record: Record<string, unknown>,
): string | undefined {
  const witnessText = selectWitnessText(record);
  if (witnessText) {
    return truncate(witnessText, 200);
  }

  for (const key of ["summary", "overview", "message", "guidance"]) {
    const value = readString(record, key);
    if (value) {
      return truncate(value, 200);
    }
  }

  const firstLongString = Object.values(record).find(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );
  return firstLongString ? truncate(firstLongString, 200) : undefined;
}

function buildValuePreview(value: unknown): string {
  if (Array.isArray(value)) {
    return `${value.length} item(s)`;
  }

  if (isRecord(value)) {
    return `${Object.keys(value).length} field(s)`;
  }

  return formatInlineValue(value);
}

function summarizeWitnessInference(
  inference: Record<string, unknown>,
): string | undefined {
  const provider = readString(inference, "provider");
  const synthesisRole = asRecord(asRecord(inference.roles).synthesis);
  const model = readString(synthesisRole, "model_used");

  if (!provider && !model) {
    return undefined;
  }

  return [provider, model].filter(Boolean).join(" · ");
}

function summarizeNarrativeField(
  value: string | undefined,
  maxLength = 220,
): string | undefined {
  if (!value) {
    return undefined;
  }

  const firstBlock =
    value
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .find((block) => block.length > 0 && !block.startsWith("|")) ?? value;
  const normalized = firstBlock
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return normalized ? truncate(normalized, maxLength) : undefined;
}

function filterWorkflowAgentSection(
  value: Record<string, unknown>,
): Record<string, unknown> {
  return compactRecord({
    perspective: summarizeNarrativeField(readString(value, "perspective"), 220),
    pattern_note: summarizeNarrativeField(
      readString(value, "pattern_note"),
      180,
    ),
    somatic_note: summarizeNarrativeField(
      readString(value, "somatic_note"),
      180,
    ),
  });
}

function summarizeSadeSati(value: Record<string, unknown>): string | undefined {
  if (readBoolean(value, "is_active") === false) {
    return "Inactive";
  }

  if (readBoolean(value, "is_active") === true) {
    const phase = readString(value, "phase");
    return phase ? `Active · ${phase}` : "Active";
  }

  return undefined;
}

function buildBiorhythmCycleRow(
  label: string,
  cycle: Record<string, unknown>,
): Array<string | undefined> {
  return [
    label,
    summarizeCycleValue(cycle),
    formatDaysOffset(readNumber(cycle, "days_until_critical")),
    formatDaysOffset(readNumber(cycle, "days_until_peak")),
  ];
}

function readTransitAspectHeadline(
  payload: Record<string, unknown>,
): string | undefined {
  const firstAspect = getRecordArray(payload.aspects)[0];
  if (!firstAspect) {
    return undefined;
  }

  const parts = [
    readString(firstAspect, "transiting_planet"),
    readString(firstAspect, "aspect_type"),
    readString(firstAspect, "natal_planet"),
    formatOrb(readNumber(firstAspect, "orb")),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function humanizeOptionalPhrase(value?: string): string | undefined {
  return value ? humanizePhrase(value) : undefined;
}

function formatDaysOffset(value: number | undefined): string | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? `${Math.round(value)}d`
    : undefined;
}

function formatCountValue(value: number | undefined): string | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? String(Math.round(value))
    : undefined;
}

function formatDecimalValue(
  value: number | undefined,
  digits: number,
): string | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(digits)
    : undefined;
}

function formatOrb(value: number | undefined): string | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? `${value.toFixed(2)}°`
    : undefined;
}

function formatInlineValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((entry) => formatInlineValue(entry))
      .join(", ");
  }

  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "undefined";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "number") {
    return Number.isInteger(value)
      ? String(value)
      : value.toFixed(value < 10 ? 2 : 1);
  }

  if (typeof value === "string") {
    return truncate(value, 180);
  }

  return buildValuePreview(value);
}

function formatHeading(label: string, level: number): string {
  return level <= 4
    ? `${"#".repeat(Math.max(2, level))} ${label}`
    : `**${label}**`;
}

function humanizeKey(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function humanizePhrase(value: string): string {
  return humanizeKey(value).replace(/\bOf\b/g, "of");
}

function humanizeTarotSpreadType(value?: string): string | undefined {
  return value ? humanizeKey(value) : undefined;
}

function singularize(label: string): string {
  return label.endsWith("s") && label.length > 3 ? label.slice(0, -1) : label;
}

function isInlineValue(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    (Array.isArray(value) && value.every((entry) => isPrimitive(entry)))
  );
}

function isPrimitive(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry): entry is string =>
      typeof entry === "string" && entry.trim().length > 0,
  );
}

function getTopRecommendation(value: unknown): Record<string, unknown> {
  const recommendations = getRecommendationRecords(value);
  if (recommendations.length === 0) {
    return {};
  }

  return recommendations.sort(
    (left, right) =>
      (readNumber(right, "score") ?? 0) - (readNumber(left, "score") ?? 0),
  )[0]!;
}

function getRecommendationRecords(
  value: unknown,
): Array<Record<string, unknown>> {
  if (!Array.isArray(value) || value.length === 0) {
    return [];
  }

  return value
    .map((entry) => asRecord(entry))
    .filter((entry) => Object.keys(entry).length > 0);
}

function formatJoinedStringLine(
  label: string,
  values: string[],
): string | null {
  return values.length > 0 ? `- ${label}: ${values.join(", ")}` : null;
}

function formatLimitedList(values: string[], limit: number): string {
  const visible = values.slice(0, limit).join(", ");
  const hiddenCount = values.length - limit;
  return hiddenCount > 0
    ? `${visible}; ${hiddenCount} more not shown`
    : visible;
}

function compactRecord(
  record: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => {
      if (value === undefined || value === null) {
        return false;
      }

      if (typeof value === "string") {
        return value.trim().length > 0;
      }

      if (Array.isArray(value)) {
        return value.length > 0;
      }

      if (isRecord(value)) {
        return Object.keys(value).length > 0;
      }

      return true;
    }),
  );
}

function compactMarkdown(lines: Array<string | null | undefined>): string[] {
  const compact: string[] = [];

  for (const line of lines) {
    if (typeof line !== "string") {
      continue;
    }
    if (line === "" && compact[compact.length - 1] === "") {
      continue;
    }
    compact.push(line);
  }

  if (compact[compact.length - 1] === "") {
    compact.pop();
  }

  return compact;
}

function truncate(value: string | undefined, maxLength = 80): string {
  if (!value) {
    return "";
  }

  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function formatAbsoluteTime(value?: string): string {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatCalculationTime(milliseconds?: number): string {
  if (
    typeof milliseconds !== "number" ||
    !Number.isFinite(milliseconds) ||
    milliseconds <= 0
  ) {
    return "Unavailable";
  }

  if (milliseconds < 1000) {
    return `${Math.round(milliseconds)}ms`;
  }

  const seconds = milliseconds / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${Math.round(seconds % 60)}s`;
}

interface EngineResultPresentationOptions {
  requestPayload?: Record<string, unknown>;
  contextLines?: string[];
}
