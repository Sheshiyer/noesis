import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEngineResultMarkdown,
  buildReadingResultMarkdown,
  buildWorkflowResultMarkdown,
  getReadingStructuredKeys,
  hasReadingRequestContext,
  listStructuredKeys,
} from "./execution-result-presenter";
import {
  EngineExecutionResult,
  ReadingSummary,
  WorkflowExecutionResult,
} from "./types";

test("buildEngineResultMarkdown turns nested engine payloads into readable sections", () => {
  const result: EngineExecutionResult = {
    engineId: "vedic-clock",
    witnessPrompt: "Triple Warmer fire is balancing the sleep transition.",
    consciousnessLevel: 2,
    timestamp: "2026-04-22T15:30:00Z",
    metadata: {
      calculation_time_ms: 6,
      cache_state: "fresh",
    },
    result: {
      current_organ: {
        organ: "TripleWarmer",
        time_window: "9 PM - 11 PM",
      },
      current_dosha: {
        dosha: "Kapha",
      },
      synthesis:
        "Triple Warmer time during Kapha period balances sleep energy.",
      recommendations: [
        {
          activity: "Light reading",
          quality: "neutral",
          reason: "Balancing all body systems before sleep",
        },
      ],
      upcoming_transitions: [
        {
          time: "23:00",
          new_dosha: "Vata",
          description: "The late-night airy period begins",
        },
      ],
      timezone: {
        local_hour: 21,
        offset_minutes: 330,
      },
    },
    raw: {
      engine_id: "vedic-clock",
      result: {
        current_organ: {
          organ: "TripleWarmer",
        },
      },
    },
  };

  const markdown = buildEngineResultMarkdown("Vedic Clock Result", result, {
    requestPayload: {
      birth_data: {
        date: "1991-08-13",
        time: "13:31",
        timezone: "Asia/Kolkata",
      },
      precision: "Standard",
    },
  });

  assert.match(markdown, /## Current Pulse/);
  assert.match(markdown, /\| Signal \| Value \|/);
  assert.match(markdown, /\| Organ \| TripleWarmer \|/);
  assert.match(markdown, /## Reading Brief/);
  assert.match(markdown, /- Current organ: TripleWarmer/);
  assert.match(markdown, /## Request Context/);
  assert.match(markdown, /### Recommended Activities/);
  assert.match(
    markdown,
    /\| Light reading \| Neutral \| Balancing all body systems before sleep \|/,
  );
  assert.match(markdown, /### Upcoming Transitions/);
  assert.match(
    markdown,
    /\| 23:00 \| Vata \| The late-night airy period begins \|/,
  );
  assert.match(markdown, /### Timezone Resolution/);
  assert.match(markdown, /## Response Metadata/);
  assert.doesNotMatch(markdown, /## Raw Response Preview/);
});

test("buildEngineResultMarkdown prefers dyad witness response and shows the witness layer", () => {
  const result: EngineExecutionResult = {
    engineId: "biorhythm",
    witnessPrompt:
      "Your body is ready. Bring that readiness into one concrete act.",
    witnessLayer: {
      response:
        "Your body is ready. Bring that readiness into one concrete act.",
      synthesis: "Action is available, but it needs conscious direction.",
      aletheios: {
        perspective: "Your momentum is real.",
      },
      pichet: {
        perspective: "Choose one honest action instead of three impulses.",
      },
    },
    metadata: {
      calculation_time_ms: 9,
    },
    result: {
      overall_energy: 88,
      physical: { percentage: 92, phase: "Rising" },
      emotional: { percentage: 54, phase: "Stable" },
      intellectual: { percentage: 61, phase: "Steady" },
    },
    raw: {
      engine_id: "biorhythm",
    },
  };

  const markdown = buildEngineResultMarkdown("Biorhythm Result", result);

  assert.match(
    markdown,
    /Your body is ready\. Bring that readiness into one concrete act\./,
  );
  assert.match(markdown, /## Witness Layer/);
  assert.match(markdown, /- Response: Your body is ready\./);
  assert.match(markdown, /### Pichet/);
});

test("buildEngineResultMarkdown maps biorhythm cycles and forecast rows into tables", () => {
  const result: EngineExecutionResult = {
    engineId: "biorhythm",
    metadata: {
      calculation_time_ms: 9,
    },
    result: {
      overall_energy: 54.35883860107817,
      critical_days: ["2026-05-09", "2026-05-10"],
      physical: {
        percentage: 18.445602783706587,
        phase: "Falling",
        days_until_critical: 9,
        days_until_peak: 15,
      },
      emotional: {
        percentage: 81.17449009292713,
        phase: "Rising",
        days_until_critical: 11,
        days_until_peak: 4,
      },
      intellectual: {
        percentage: 64.08662784208342,
        phase: "Falling",
        days_until_critical: 2,
        days_until_peak: 27,
      },
      intuitive: {
        percentage: 13.213804466338946,
        phase: "Rising",
        days_until_critical: 5,
        days_until_peak: 15,
      },
      spiritual: {
        percentage: 84.82755145315464,
        phase: "Falling",
        days_until_critical: 7,
        days_until_peak: 47,
      },
      forecast: [
        {
          date: "2026-05-09",
          overall_energy: 53.974681373054494,
          physical: 9.151505349482791,
          spiritual: 80.34000729092679,
          intuitive: 19.28936436551303,
        },
      ],
    },
    raw: {
      engine_id: "biorhythm",
    },
  };

  const markdown = buildEngineResultMarkdown("Biorhythm Result", result);

  assert.match(markdown, /### Current Cycles/);
  assert.match(markdown, /\| Cycle \| State \| Critical \| Peak \|/);
  assert.match(markdown, /\| Physical \| Falling · 18% \| 9d \| 15d \|/);
  assert.match(markdown, /### Critical Window/);
  assert.match(markdown, /2026-05-09, 2026-05-10/);
  assert.match(markdown, /### Forecast/);
  assert.match(markdown, /\| 2026-05-09 \| 54% \| 9% \| 80% \| 19% \|/);
});

test("buildEngineResultMarkdown maps nadabrahman remedy responses and request context cleanly", () => {
  const result: EngineExecutionResult = {
    engineId: "nadabrahman",
    witnessPrompt:
      "In the stillness of night, what is the quietest sound you can hear? What happens when you listen beyond that? The raga Shubhapantuvarali carries a particular emotional quality. If you were to hum a single note right now, what pitch would your body choose? What feeling arises with that tone? If your entire being — body, breath, and awareness — were a musical instrument, what is it playing right now? Listen without changing the melody.",
    witnessLayer: {
      response:
        "In the stillness of night, what is the quietest sound you can hear? What happens when you listen beyond that? The raga Shubhapantuvarali carries a particular emotional quality. If you were to hum a single note right now, what pitch would your body choose? What feeling arises with that tone? If your entire being — body, breath, and awareness — were a musical instrument, what is it playing right now? Listen without changing the melody.\n\nThe pattern and the body agree — this is a convergence point worth your attention.",
    },
    consciousnessLevel: 0,
    metadata: {
      calculation_time_ms: 0.019249000000000002,
      backend: "native",
      precision_achieved: "standard",
      cached: false,
      timestamp: "2026-04-30T21:39:59.799324020Z",
      engine_version: "3.0.0",
    },
    result: {
      recommendations: [
        {
          arohanam: ["sa", "ri1", "ga2", "ma2", "pa", "dha1", "ni3", "sa"],
          avarohanam: ["sa", "ni3", "dha1", "pa", "ma2", "ga2", "ri1", "sa"],
          mood: "intense",
          raga_name: "Shubhapantuvarali",
          raga_number: 45,
          score: 1,
          reason:
            "Deeply contemplative raga with intense inward-turning quality",
          therapeutic_qualities: [
            "deep_healing",
            "karmic_release",
            "transformation",
          ],
        },
        {
          arohanam: ["sa", "ri1", "ga1", "ma2", "pa", "dha1", "ni3", "sa"],
          avarohanam: ["sa", "ni3", "dha1", "pa", "ma2", "ga1", "ri1", "sa"],
          mood: "intense",
          raga_name: "Jhalavarali",
          raga_number: 39,
          score: 0.95,
          reason: "Rare and mysterious, suitable for deep night meditation",
          therapeutic_qualities: ["shadow_work", "transmutation"],
        },
      ],
      time_recommendation: {
        dosha_dominance: "vata",
        energy_quality: "inward",
        prahar_name: "Pradosha (Early Night)",
        prahar_number: 6,
        primary_raga: {
          raga_name: "Shubhapantuvarali",
          raga_number: 45,
          reason:
            "Deeply contemplative raga with intense inward-turning quality",
        },
        time_range: "21:00-00:00",
      },
    },
    raw: {
      engine_id: "nadabrahman",
    },
  };

  const markdown = buildEngineResultMarkdown("NadaBrahman Result", result, {
    requestPayload: {
      birth_data: {
        name: "Cumbipuram Nateshan Sheshnarayan Iyer",
        date: "1991-08-13",
        time: "13:31",
        latitude: 12.9716,
        longitude: 77.5946,
        timezone: "Asia/Kolkata",
      },
      current_time: "2026-04-30T20:48:26.796Z",
      precision: "Standard",
    },
  });

  assert.match(markdown, /## Sonic Remedy/);
  assert.match(markdown, /\| Primary Raga \| Shubhapantuvarali \|/);
  assert.match(markdown, /\| Prahar \| Pradosha \(Early Night\) \|/);
  assert.match(markdown, /\| Window \| 21:00-00:00 \|/);
  assert.match(markdown, /\| Dosha \| Vata \|/);
  assert.match(markdown, /\| Energy \| Inward \|/);
  assert.match(markdown, /\| Mood \| Intense \|/);
  assert.match(markdown, /## Reading Brief/);
  assert.match(markdown, /- Primary raga: Shubhapantuvarali/);
  assert.match(
    markdown,
    /- Listening window: Pradosha \(Early Night\) · 21:00-00:00/,
  );
  assert.match(markdown, /- Dosha dominance: Vata/);
  assert.match(markdown, /- Energy quality: Inward/);
  assert.match(
    markdown,
    /- Therapeutic qualities: Deep Healing, Karmic Release, Transformation/,
  );
  assert.match(markdown, /## Request Context/);
  assert.match(markdown, /### Birth Data/);
  assert.match(markdown, /- Name: Cumbipuram Nateshan Sheshnarayan Iyer/);
  assert.match(markdown, /- Current Time: 2026-04-30T20:48:26.796Z/);
  assert.match(markdown, /- Precision: Standard/);
  assert.match(markdown, /## Result Map/);
  assert.match(markdown, /\*\*Recommendation 1\*\*/);
  assert.match(markdown, /### Time Recommendation/);
  assert.match(markdown, /- Arohanam: sa, ri1, ga2, ma2, pa, dha1, ni3, sa/);
  assert.match(markdown, /- Avarohanam: sa, ni3, dha1, pa, ma2, ga2, ri1, sa/);
});

test("buildEngineResultMarkdown renders tarot spreads as readable card sections", () => {
  const result: EngineExecutionResult = {
    engineId: "tarot",
    witnessPrompt:
      'How do these cards speak to your question: "the current plantery transits analysis"?',
    consciousnessLevel: 0,
    metadata: {
      calculation_time_ms: 3,
    },
    result: {
      question: "the current plantery transits analysis",
      spread: {
        name: "Celtic Cross",
        type: "celtic_cross",
        description:
          "A comprehensive 10-card spread providing deep insight into a situation",
      },
      positions: [
        {
          name: "Present",
          position: 0,
          meaning: "The heart of the matter; your current situation",
          card: {
            name: "The World",
            arcana: "major",
            element: "earth",
            isReversed: false,
            interpretation: {
              meaning: "Completion, integration, accomplishment, travel",
              keywords: ["completion", "wholeness", "achievement"],
            },
          },
        },
        {
          name: "Challenge",
          position: 1,
          meaning: "What crosses you; the immediate challenge or obstacle",
          card: {
            name: "Queen of Swords",
            arcana: "minor",
            element: "air",
            suit: "swords",
            isReversed: true,
            interpretation: {
              meaning: "Overly emotional, easily influenced, cold-hearted",
              keywords: ["independence", "clarity"],
            },
          },
        },
        {
          name: "Foundation",
          position: 2,
          meaning: "The root of the situation; what lies beneath",
          card: {
            name: "The Moon",
            arcana: "major",
            element: "water",
            isReversed: true,
            interpretation: {
              meaning: "Release of fear, repressed emotion, inner confusion",
              keywords: ["illusion", "intuition"],
            },
          },
        },
        {
          name: "Recent Past",
          position: 3,
          meaning: "What is passing away; recent influences",
          card: {
            name: "The Emperor",
            arcana: "major",
            element: "fire",
            isReversed: false,
            interpretation: {
              meaning: "Authority, structure, control, fatherhood, stability",
              keywords: ["authority", "structure"],
            },
          },
        },
        {
          name: "Near Future",
          position: 4,
          meaning: "What lies ahead; influences entering your life",
          card: {
            name: "Nine of Cups",
            arcana: "minor",
            element: "water",
            suit: "cups",
            isReversed: false,
            interpretation: {
              meaning: "Contentment, satisfaction, gratitude, wish come true",
              keywords: ["contentment", "gratitude"],
            },
          },
        },
      ],
    },
    raw: {
      engine_id: "tarot",
    },
  };

  const markdown = buildEngineResultMarkdown("Tarot Result", result, {
    requestPayload: {
      options: {
        question: "the current plantery transits analysis",
        spread: "celtic_cross",
      },
    },
  });

  assert.match(markdown, /## Spread Overview/);
  assert.match(markdown, /\| Spread \| Celtic Cross \|/);
  assert.match(markdown, /- Spread: Celtic Cross/);
  assert.match(markdown, /- Cards drawn: 5/);
  assert.match(markdown, /### Cards Drawn/);
  assert.match(markdown, /#### 1\. Present/);
  assert.match(markdown, /- Card: The World/);
  assert.match(markdown, /- Orientation: Reversed/);
  assert.match(markdown, /#### 5\. Near Future/);
  assert.match(markdown, /- Keywords: Completion, Wholeness, Achievement/);
  assert.doesNotMatch(markdown, /field\(s\)/);
  assert.doesNotMatch(markdown, /more item\(s\) not shown/);
});

test("buildWorkflowResultMarkdown organizes synthesis and per-engine outputs", () => {
  const result: WorkflowExecutionResult = {
    workflowId: "daily-practice",
    totalTimeMs: 25.4,
    timestamp: "2026-04-22T15:40:00Z",
    synthesis: {
      summary: "A reflective and disciplined day.",
      recommendation: "Favor quieter work and closing loops.",
    },
    engineOutputs: {
      panchanga: {
        engineId: "panchanga",
        witnessPrompt: "Observe the fasting current.",
        result: {
          tithi_name: "Ekadashi",
          tithi_index: 11,
          tithi_value: 11.4,
          nakshatra_name: "Uttara Phalguni",
          nakshatra_index: 12,
          nakshatra_value: 12.1,
          yoga_name: "Siddha",
          yoga_index: 20,
          yoga_value: 20.7,
          vara_name: "Mangalavara (Tuesday)",
          vara_index: 2,
          karana_name: "Vishti",
          karana_index: 6,
          karana_value: 8,
        },
        metadata: {
          calculation_time_ms: 12.5,
        },
        raw: {},
      },
      numerology: {
        engineId: "numerology",
        witnessPrompt: "Completion energy is dominant.",
        consciousnessLevel: 4,
        result: {
          life_path: 9,
        },
        metadata: {
          calculation_time_ms: 8.1,
        },
        raw: {},
      },
    },
    raw: {
      workflow_id: "daily-practice",
    },
  };

  const markdown = buildWorkflowResultMarkdown(
    "Daily Practice Result",
    result,
    {
      precision: "Standard",
      options: {
        mode: "daily",
      },
    },
  );

  assert.match(markdown, /## Run Brief/);
  assert.match(markdown, /- Engine outputs returned: 2/);
  assert.match(markdown, /## Dyad Lens/);
  assert.match(markdown, /### Synthesis/);
  assert.match(markdown, /### Panchanga/);
  assert.match(markdown, /\| Factor \| Name \| Index \| Value \|/);
  assert.match(markdown, /\| Tithi \| Ekadashi \| 11 \| 11\.40 \|/);
  assert.match(markdown, /### Numerology/);
  assert.doesNotMatch(markdown, /## Raw Response Preview/);
});

test("buildWorkflowResultMarkdown expands nested workflow engine result fields instead of preview counts", () => {
  const result: WorkflowExecutionResult = {
    workflowId: "daily-practice",
    totalTimeMs: 11.2,
    timestamp: "2026-05-01T20:32:55.623Z",
    synthesis: {
      summary: "The full portrait is a mirror, not a map.",
    },
    engineOutputs: {
      biorhythm: {
        engineId: "biorhythm",
        witnessPrompt:
          "Your physical cycle is at 100% while emotional is at 5%.",
        result: {
          overall_energy: 68,
          critical_days: ["2026-05-05", "2026-05-06"],
          physical: {
            percentage: 100,
            phase: "Peak",
            critical_days: ["2026-05-05", "2026-05-06"],
          },
          emotional: {
            percentage: 5,
            phase: "Rising",
          },
          intellectual: {
            percentage: 99,
            phase: "Peak",
          },
          forecast: [
            {
              date: "2026-05-05",
              overall_energy: 70,
              physical: 100,
              spiritual: 48,
              intuitive: 43,
            },
          ],
        },
        metadata: {
          calculation_time_ms: 3.4,
        },
        raw: {},
      },
    },
    raw: {
      workflow_id: "daily-practice",
    },
  };

  const markdown = buildWorkflowResultMarkdown("Daily Practice Result", result);

  assert.match(markdown, /#### Result/);
  assert.match(markdown, /\*\*Current Cycles\*\*/);
  assert.match(markdown, /\| Physical \| Peak · 100% \| — \| — \|/);
  assert.match(markdown, /\| Emotional \| Rising · 5% \| — \| — \|/);
  assert.match(markdown, /\*\*Critical Window\*\*/);
  assert.match(markdown, /2026-05-05, 2026-05-06/);
  assert.doesNotMatch(markdown, /Physical: \d+ field\(s\)/);
  assert.doesNotMatch(markdown, /Emotional: \d+ field\(s\)/);
  assert.doesNotMatch(markdown, /Intellectual: \d+ field\(s\)/);
});

test("buildWorkflowResultMarkdown surfaces witness dyad text for workflow and engine outputs", () => {
  const result: WorkflowExecutionResult = {
    workflowId: "daily-practice",
    totalTimeMs: 19.4,
    timestamp: "2026-05-01T03:05:00Z",
    synthesis: {
      witness_layer: {
        response:
          "You do not need a bigger plan today. You need one honest action.",
        synthesis:
          "Resolve the inner split by acting on what is already clear.",
        pichet: {
          perspective: "Keep it concrete.",
        },
      },
    },
    engineOutputs: {
      biorhythm: {
        engineId: "biorhythm",
        witnessPrompt:
          "Your body can carry more truth than your mind is admitting.",
        witnessLayer: {
          response:
            "Your body can carry more truth than your mind is admitting.",
          synthesis: "Let the physical surplus steady the emotional field.",
        },
        result: {
          overall_energy: 84,
        },
        metadata: {
          calculation_time_ms: 10.4,
        },
        raw: {},
      },
    },
    raw: {
      workflow_id: "daily-practice",
    },
  };

  const markdown = buildWorkflowResultMarkdown("Daily Practice Result", result);

  assert.match(
    markdown,
    /You do not need a bigger plan today\. You need one honest action\./,
  );
  assert.match(markdown, /### Synthesis/);
  assert.match(markdown, /### Pichet/);
  assert.match(markdown, /### Biorhythm/);
  assert.match(
    markdown,
    /Your body can carry more truth than your mind is admitting\./,
  );
  assert.match(markdown, /#### Witness Layer/);
});

test("buildWorkflowResultMarkdown prefers richer workflow fields and caps overflow cleanly", () => {
  const result: WorkflowExecutionResult = {
    workflowId: "daily-practice",
    readingId: "reading-42",
    createdAt: "2026-05-08T00:22:16.559619348Z",
    subject: "Evening integration through disciplined closure.",
    totalTimeMs: 31.7,
    timestamp: "2026-05-08T00:22:16.559619348Z",
    evidence: [
      "transits",
      "vedic-clock",
      "biorhythm",
      "panchanga",
      "vimshottari",
      "nadabrahman",
      "numerology",
      "tarot",
      "iching",
    ],
    report: {
      opening_response:
        "The richer workflow report should lead the page when it is present.",
      run_brief: {
        route: "Witness Gateway",
        posture: "Close loops before opening new ones.",
      },
    },
    synthesis: {
      witness_layer: {
        response:
          "Fallback witness text should not outrank the explicit opening response.",
        synthesis: "Use the cleaner report sections when available.",
        aletheios: {
          perspective: "The day favors completion over expansion.",
        },
        pichet: {
          perspective: "Keep the body steady and finish one thing well.",
        },
        decoder_state: {
          total_visits: 4,
          nested: {
            streak: {
              current: 3,
            },
          },
        },
        max_layer_unlocked: 2,
      },
      summary: "A reflective and disciplined day.",
    },
    engineOutputs: {
      biorhythm: {
        engineId: "biorhythm",
        witnessPrompt: "Carry the truth already available in the body.",
        result: {
          overall_energy: 84,
        },
        metadata: {
          calculation_time_ms: 10.4,
        },
        raw: {},
      },
    },
    raw: {
      workflow_id: "daily-practice",
      reading_id: "reading-42",
      created_at: "2026-05-08T00:22:16.559619348Z",
      subject: "Evening integration through disciplined closure.",
      evidence: [
        "transits",
        "vedic-clock",
        "biorhythm",
        "panchanga",
        "vimshottari",
        "nadabrahman",
        "numerology",
        "tarot",
        "iching",
      ],
      report: {
        opening_response:
          "The richer workflow report should lead the page when it is present.",
        run_brief: {
          route: "Witness Gateway",
          posture: "Close loops before opening new ones.",
        },
      },
    },
  };

  const markdown = buildWorkflowResultMarkdown("Daily Practice Result", result);

  assert.match(
    markdown,
    /The richer workflow report should lead the page when it is present\./,
  );
  assert.match(markdown, /- Reading ID: reading-42/);
  assert.match(
    markdown,
    /- Subject: Evening integration through disciplined closure\./,
  );
  assert.match(markdown, /- Route: Witness Gateway/);
  assert.match(markdown, /### Aletheios/);
  assert.match(markdown, /### Pichet/);
  assert.match(markdown, /### Progression Metadata/);
  assert.match(markdown, /#### Decoder State/);
  assert.match(markdown, /\*\*Nested\*\*/);
  assert.match(markdown, /## Why This Reading/);
  assert.match(
    markdown,
    /- Inputs: Transits, Vedic Clock, Biorhythm, Panchanga, Vimshottari, Nadabrahman, Numerology, Tarot; 1 more not shown/,
  );
  assert.doesNotMatch(markdown, /Fallback witness text should not outrank/);
});

test("buildWorkflowResultMarkdown turns engine-only evidence into a compact why brief", () => {
  const arrayEvidenceResult: WorkflowExecutionResult = {
    workflowId: "daily-practice",
    totalTimeMs: 17.2,
    timestamp: "2026-06-05T02:30:00Z",
    evidence: [
      "transits",
      "vedic-clock",
      "biorhythm",
      "panchanga",
      "vimshottari",
      "nadabrahman",
      "numerology",
      "tarot",
      "iching",
    ],
    engineOutputs: {},
    synthesis: {
      witness_layer: {
        response: "A concise reading should still explain the inputs used.",
      },
    },
    raw: {
      workflow_id: "daily-practice",
    },
  };
  const objectEvidenceResult: WorkflowExecutionResult = {
    workflowId: "daily-practice",
    totalTimeMs: 12,
    timestamp: "2026-06-05T02:32:00Z",
    evidence: {
      engines_used: ["vedic-clock", "biorhythm"],
    },
    engineOutputs: {},
    synthesis: {
      witness_layer: {
        response: "The inputs should read as a brief, not nested evidence.",
      },
    },
    raw: {
      workflow_id: "daily-practice",
    },
  };

  const arrayMarkdown = buildWorkflowResultMarkdown(
    "Daily Practice Result",
    arrayEvidenceResult,
  );
  const objectMarkdown = buildWorkflowResultMarkdown(
    "Daily Practice Result",
    objectEvidenceResult,
  );

  assert.match(arrayMarkdown, /## Why This Reading/);
  assert.match(
    arrayMarkdown,
    /- Inputs: Transits, Vedic Clock, Biorhythm, Panchanga, Vimshottari, Nadabrahman, Numerology, Tarot; 1 more not shown/,
  );
  assert.doesNotMatch(arrayMarkdown, /## Evidence/);
  assert.match(objectMarkdown, /## Why This Reading/);
  assert.match(objectMarkdown, /- Inputs: Vedic Clock, Biorhythm/);
  assert.doesNotMatch(objectMarkdown, /### Engines Used/);
  assert.doesNotMatch(objectMarkdown, /### Evidence Details/);
});

test("buildWorkflowResultMarkdown summarizes structured workflow subjects cleanly", () => {
  const result: WorkflowExecutionResult = {
    workflowId: "daily-practice",
    readingId: "rdg_20260508033207_daily-practice_cf7af2e3",
    createdAt: "2026-05-08T03:32:07.413Z",
    subject: {
      birth_date: "1991-08-13",
      birth_time: "13:19",
      timezone: "Asia/Kolkata",
      latitude: 12.9716,
      longitude: 77.5946,
      location_label: null,
    },
    evidence: {
      engines_used: ["transits", "biorhythm", "vedic-clock", "panchanga"],
    },
    engineOutputs: {},
    synthesis: {
      witness_layer: {
        response: "Use the clean summary line for the subject context.",
      },
    },
    raw: {
      workflow_id: "daily-practice",
      subject: {
        birth_date: "1991-08-13",
        birth_time: "13:19",
        timezone: "Asia/Kolkata",
        latitude: 12.9716,
        longitude: 77.5946,
        location_label: null,
      },
    },
  };

  const markdown = buildWorkflowResultMarkdown("Daily Practice Result", result);

  assert.match(
    markdown,
    /- Subject: 1991-08-13 at 13:19 · Asia\/Kolkata · 12\.9716, 77\.5946/,
  );
  assert.match(markdown, /## Request Context/);
  assert.match(markdown, /- Birth Date: 1991-08-13/);
  assert.match(markdown, /- Birth Time: 13:19/);
  assert.doesNotMatch(markdown, /Subject: \d+ field\(s\)/);
});

test("buildWorkflowResultMarkdown promotes live ritual fields above the full reflection blob", () => {
  const result: WorkflowExecutionResult = {
    workflowId: "daily-practice",
    readingId: "rdg_20260508034434_daily-practice_b3bc3e67",
    createdAt: "2026-05-08T03:44:34.559Z",
    subject: {
      name: "Cumbipuram Nateshan Sheshnarayan Iyer",
      birth_date: "1991-08-13",
      birth_time: "13:31",
      timezone: "Asia/Calcutta",
      latitude: 12.9716,
      longitude: 77.5946,
    },
    evidence: {
      engines_used: ["vedic-clock", "biorhythm", "transits", "panchanga"],
      contributions: [
        {
          engine_id: "vedic-clock",
          signal: "Spleen timing is carrying the strongest temporal signal.",
          impact:
            "This shapes when action will feel coherent instead of forced.",
        },
      ],
    },
    engineOutputs: {
      biorhythm: {
        engineId: "biorhythm",
        witnessPrompt:
          "Your spiritual cycle is at 85% while intuitive is at 13%.",
        result: {
          overall_energy: 54.35883860107817,
          critical_days: ["2026-05-09", "2026-05-10"],
          forecast: [
            {
              date: "2026-05-09",
              overall_energy: 53.974681373054494,
              physical: 9.151505349482791,
              spiritual: 80.34000729092679,
              intuitive: 19.28936436551303,
            },
          ],
        },
        metadata: {
          calculation_time_ms: 0.517262,
        },
        raw: {},
      },
    },
    synthesis: {
      witness_layer: {
        title:
          "Unified Reflection for 2026-05-08, 9 - 11 AM (Spleen/Earth, Kapha)",
        summary: "---",
        practice: [
          "Protect the next critical window: 2026-05-09 to 2026-05-10.",
          "Spleen meridian active (Earth).",
        ],
        question: "Notice: how does this contrast show up in your day?",
        response:
          "**Unified Reflection for 2026-05-08, 9 - 11 AM (Spleen/Earth, Kapha)**\n\n### 1. What the body and mind are calling us to review",
        aletheios: {
          perspective:
            "Spleen timing is carrying the strongest temporal signal.",
        },
        pichet: {
          perspective: "Physical energy low - honor rest, body is integrating.",
        },
      },
    },
    raw: {
      workflow_id: "daily-practice",
    },
  };

  const markdown = buildWorkflowResultMarkdown("Daily Practice Result", result);

  assert.match(markdown, /## Current Reading/);
  assert.match(
    markdown,
    /### Unified Reflection for 2026-05-08, 9 - 11 AM \(Spleen\/Earth, Kapha\)/,
  );
  assert.match(markdown, /### Practice/);
  assert.match(
    markdown,
    /Protect the next critical window: 2026-05-09 to 2026-05-10\./,
  );
  assert.match(markdown, /### Reflection Question/);
  assert.match(
    markdown,
    /- Synthesis: Unified Reflection for 2026-05-08, 9 - 11 AM \(Spleen\/Earth, Kapha\)/,
  );
  assert.match(markdown, /## Why This Reading/);
  assert.match(markdown, /\| Input \| Signal \| Impact \|/);
  assert.match(
    markdown,
    /\| Vedic Clock \| Spleen timing is carrying the strongest temporal signal\. \| This shapes when action will feel coherent instead of forced\. \|/,
  );
  assert.match(markdown, /\*\*Forecast\*\*/);
  assert.match(markdown, /## Full Reflection/);
  assert.doesNotMatch(markdown, /- Synthesis: \*\*/);
  assert.ok(
    markdown.indexOf("## Why This Reading") <
      markdown.indexOf("## Engine Outputs"),
  );
  assert.ok(
    markdown.indexOf("## Engine Outputs") <
      markdown.indexOf("## Full Reflection"),
  );
});

test("buildWorkflowResultMarkdown strips engine meta noise and tables transit rows", () => {
  const result: WorkflowExecutionResult = {
    workflowId: "daily-practice",
    totalTimeMs: 22.6,
    timestamp: "2026-05-08T03:44:34.559Z",
    synthesis: {
      witness_layer: {
        summary: "A focused day.",
      },
    },
    engineOutputs: {
      transits: {
        engineId: "transits",
        witnessPrompt:
          "With Pluto, Rahu retrograde, the energy turns inward. What internal review is being called for?",
        witnessLayer: {
          response:
            "With Pluto, Rahu retrograde, the energy turns inward. What internal review is being called for?",
          aletheios: {
            agent: "aletheios",
            perspective: "The external weather line is demanding review.",
            domains_consulted: ["lorenz-kundli", "bioelectric"],
            confidence: 0.8,
            pattern_note: "",
          },
          pichet: {
            agent: "pichet",
            perspective: "Keep the body quiet enough to register the pressure.",
            domains_consulted: ["lorenz-kundli"],
            confidence: 0.8,
            somatic_note: "",
          },
          routing_mode: "dyad-synthesis",
          promo_label: "Enterprise Promo",
        },
        result: {
          period_quality: "Favorable",
          retrograde_planets: ["Pluto", "Rahu"],
          sade_sati: {
            is_active: false,
          },
          aspects: [
            {
              transiting_planet: "Sun",
              aspect_type: "Opposition",
              natal_planet: "Pluto",
              orb: 0.54,
              nature: "Challenging",
            },
            {
              transiting_planet: "Neptune",
              aspect_type: "Opposition",
              natal_planet: "Moon",
              orb: 0.56,
              nature: "Challenging",
            },
          ],
          transit_positions: [
            {
              planet: "Sun",
              sign: "Aries",
              degree_in_sign: 23.35,
              speed: 0.9676,
              is_retrograde: false,
            },
            {
              planet: "Pluto",
              sign: "Capricorn",
              degree_in_sign: 11.28,
              speed: -0.0007,
              is_retrograde: true,
            },
          ],
          natal_positions: [
            {
              planet: "Sun",
              sign: "Cancer",
              degree_in_sign: 26.35,
              is_retrograde: false,
            },
          ],
        },
        metadata: {
          calculation_time_ms: 1.9,
        },
        raw: {},
      },
    },
    raw: {
      workflow_id: "daily-practice",
    },
  };

  const markdown = buildWorkflowResultMarkdown("Daily Practice Result", result);

  assert.match(markdown, /\| Transit \| Aspect \| Natal \| Orb \| Nature \|/);
  assert.match(
    markdown,
    /\| Sun \| Opposition \| Pluto \| 0\.54° \| Challenging \|/,
  );
  assert.match(markdown, /\| Planet \| Sign \| Degree \| Speed \| Motion \|/);
  assert.match(markdown, /### Witness Layer/);
  assert.match(
    markdown,
    /- Perspective: The external weather line is demanding review\./,
  );
  assert.doesNotMatch(markdown, /Domains Consulted/);
  assert.doesNotMatch(markdown, /Confidence/);
  assert.doesNotMatch(markdown, /Promo Label/);
  assert.doesNotMatch(
    markdown,
    /With Pluto, Rahu retrograde, the energy turns inward\./,
  );
});

test("buildReadingResultMarkdown reuses the interpreted presenter for cached readings", () => {
  const reading: ReadingSummary = {
    id: "reading-1",
    engineId: "biorhythm",
    workflowId: undefined,
    inputHash: "hash-1",
    witnessPrompt: "Track the energy curve.",
    consciousnessLevel: 3,
    calculationTimeMs: 18.5,
    createdAt: "2026-04-22T16:00:00Z",
    fetchedAt: "2026-04-22T16:05:00Z",
    payload: {
      id: "reading-1",
      engine_id: "biorhythm",
      witness_prompt: "Track the energy curve.",
      consciousness_level: 3,
      calculation_time_ms: 18.5,
      created_at: "2026-04-22T16:00:00Z",
      birth_data: {
        date: "1991-08-13",
      },
      precision: "High",
      result_data: {
        overall_energy: 72,
        physical: { percentage: 81, phase: "Rising" },
        emotional: { percentage: 68, phase: "Stable" },
        intellectual: { percentage: 67, phase: "Steady" },
      },
    },
  };

  const markdown = buildReadingResultMarkdown(reading, true);

  assert.match(markdown, /biorhythm/i);
  assert.match(markdown, /## Energy Signature/);
  assert.match(markdown, /\| Overall \| 72% \|/);
  assert.match(markdown, /## Request Context/);
  assert.match(markdown, /## Result Map/);
  assert.deepEqual(getReadingStructuredKeys(reading), [
    "Overall Energy",
    "Physical",
    "Emotional",
    "Intellectual",
  ]);
  assert.equal(hasReadingRequestContext(reading), true);
});

test("listStructuredKeys returns humanized top-level keys", () => {
  assert.deepEqual(
    listStructuredKeys({ current_organ: {}, total_time_ms: 10 }),
    ["Current Organ", "Total Time Ms"],
  );
});
