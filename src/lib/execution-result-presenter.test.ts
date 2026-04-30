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
  assert.match(markdown, /### Recommendations/);
  assert.match(markdown, /\*\*Recommendation 1\*\*/);
  assert.match(markdown, /### Timezone/);
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
          tithi: "Ekadashi",
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
  assert.match(markdown, /## Synthesis Map/);
  assert.match(markdown, /### Panchanga/);
  assert.match(markdown, /Observe the fasting current\./);
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

  const markdown = buildWorkflowResultMarkdown(
    "Daily Practice Result",
    result,
  );

  assert.match(markdown, /#### Result/);
  assert.match(markdown, /\*\*Physical\*\*/);
  assert.match(markdown, /- Percentage: 100/);
  assert.match(markdown, /- Critical Days: 2026-05-05, 2026-05-06/);
  assert.match(markdown, /\*\*Emotional\*\*/);
  assert.match(markdown, /\*\*Intellectual\*\*/);
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
          synthesis:
            "Let the physical surplus steady the emotional field.",
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

  const markdown = buildWorkflowResultMarkdown(
    "Daily Practice Result",
    result,
  );

  assert.match(
    markdown,
    /You do not need a bigger plan today\. You need one honest action\./,
  );
  assert.match(markdown, /### Biorhythm/);
  assert.match(
    markdown,
    /Your body can carry more truth than your mind is admitting\./,
  );
  assert.match(markdown, /#### Witness Layer/);
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
