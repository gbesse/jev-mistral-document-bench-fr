import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  analyze,
  plan,
  toHtml,
  date,
  cents,
  decimalCents,
  normalize,
} from "../src/index.mjs";
import { createJevClient, validateChoiceResponse, MODEL } from "../src/jev.mjs";
const corpus = JSON.parse(
  await readFile(new URL("../corpus/cases.json", import.meta.url), "utf8"),
);
const clone = (x) => structuredClone(x);
const q = {
  q: {
    type: "choice",
    instructions: "Comparer",
    criteria: { etaye: "Oui", ecart: "Non", a_revoir: "Inconnu" },
  },
};
const answer = (choice = "etaye", confidence = 0.95) => ({
  model: MODEL,
  answers: {
    q: {
      type: "choice",
      choice,
      confidence,
      probabilities: { etaye: 0.96, ecart: 0.02, a_revoir: 0.02 },
    },
  },
  usage: { input_tokens: 20, output_tokens: 5 },
});
test("Les contrôles métier annotés passent indépendamment du fournisseur", async () => {
  for (const c of corpus) {
    const r = await analyze(c.input);
    for (const [id, status] of Object.entries(c.exact)) {
      assert.equal(
        r.findings.find((f) => f.id === id)?.status,
        status,
        `${c.input.id} / ${id}`,
      );
    }
    assert.ok(r.findings.every((f) => f.evidence.length > 0));
  }
});
test("Développement et test ont des identifiants distincts", () => {
  assert.equal(new Set(corpus.map((c) => c.input.id)).size, corpus.length);
  assert.ok(corpus.some((c) => c.split === "dev"));
  assert.ok(corpus.some((c) => c.split === "test"));
});
test("Une référence absente et un ID dupliqué sont rejetés", () => {
  const x = clone(corpus[0].input);
  x.documents[0].id = "absent";
  assert.throws(() => plan(x));
  const y = clone(corpus[0].input);
  y.documents.push(clone(y.documents[0]));
  assert.throws(() => plan(y), /dupliqué/);
});
test("Validation des dates calendaires et montants", () => {
  assert.throws(() => date("2026-02-30"));
  assert.throws(() => cents(NaN));
  assert.throws(() => cents(1.1));
  assert.equal(decimalCents("100,01"), 10001);
  assert.throws(() => decimalCents("-1"));
});
test("Le HTML échappe les données importées", async () => {
  const x = clone(corpus[0].input);
  x.id = "<script>alert(1)</script>";
  const html = toHtml(await analyze(x));
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
});
test("Distribution normalisée, finie et argmax obligatoire", () => {
  assert.equal(validateChoiceResponse(answer(), q).model, MODEL);
  for (const mutation of [
    (a) => (a.answers.q.probabilities.etaye = NaN),
    (a) => (a.answers.q.probabilities.ecart = 0.8),
    (a) => (a.answers.q.choice = "ecart"),
    (a) => (a.answers.q.confidence = Infinity),
    (a) => delete a.usage,
    (a) => (a.model = "autre"),
  ]) {
    const a = answer();
    mutation(a);
    assert.throws(() => validateChoiceResponse(a, q));
  }
});
test("Pas de réponse héritée du prototype", () => {
  const a = answer();
  a.answers = Object.create(a.answers);
  assert.throws(() => validateChoiceResponse(a, q));
});
test("401 ne doit pas être réessayé", async () => {
  let calls = 0;
  const p = createJevClient({
    apiKey: "test",
    fetchImpl: async () => {
      calls++;
      return new Response("", { status: 401 });
    },
  });
  await assert.rejects(p.decide({ state: "x", questions: q }), /401/);
  assert.equal(calls, 1);
});
test("429 puis réponse valide", async () => {
  let calls = 0;
  const p = createJevClient({
    apiKey: "test",
    fetchImpl: async () =>
      ++calls === 1
        ? new Response("", { status: 429, headers: { "retry-after": "0" } })
        : Response.json(answer()),
  });
  assert.equal((await p.decide({ state: "x", questions: q })).model, MODEL);
  assert.equal(calls, 2);
});
test("Annulation pendant attente de nouvelle tentative", async () => {
  const controller = new AbortController();
  const p = createJevClient({
    apiKey: "test",
    fetchImpl: async () => {
      setTimeout(() => controller.abort(new Error("annulé")), 10);
      return new Response("", {
        status: 429,
        headers: { "retry-after": "30" },
      });
    },
  });
  await assert.rejects(
    p.decide({ state: "x", questions: q, signal: controller.signal }),
    /abort/i,
  );
});
test("Contexte trop volumineux rejeté avant transport", async () => {
  let calls = 0;
  const p = createJevClient({ apiKey: "test", fetchImpl: async () => calls++ });
  await assert.rejects(
    p.decide({ state: "a".repeat(100000), questions: q }),
    /Budget/,
  );
  assert.equal(calls, 0);
});
test("Une faible confiance provoque la revue et préserve les preuves", async () => {
  const c = corpus.find(
    (c) =>
      Object.keys(
        Object.fromEntries(
          plan(c.input)
            .pairs.filter((f) => f.left !== f.right)
            .map((f) => [f.id, f]),
        ),
      ).length,
  );
  let seen;
  const provider = {
    async decide(req) {
      seen = req;
      return {
        model: MODEL,
        answers: Object.fromEntries(
          Object.keys(req.questions).map((id) => [
            id,
            {
              type: "choice",
              choice: "etaye",
              confidence: 0.2,
              probabilities: { etaye: 0.6, ecart: 0.2, a_revoir: 0.2 },
            },
          ]),
        ),
        usage: { input_tokens: 1, output_tokens: 1 },
      };
    },
  };
  const r = await analyze(c.input, { mode: "jev", provider });
  assert.ok(
    r.findings.some((f) => f.method === "jev" && f.status === "a_revoir"),
  );
  assert.ok(!JSON.stringify(seen).includes('"expected"'));
  assert.ok(!JSON.stringify(seen).includes('"split"'));
});

test("Une pièce métier sans docId n’est pas implicitement prouvée", () => {
  const x = clone(corpus[0].input);
  let removed = false;
  function walk(o) {
    if (!o || typeof o !== "object" || removed) return;
    for (const k of Object.keys(o)) {
      if (/docid$/i.test(k)) {
        delete o[k];
        removed = true;
        return;
      }
      if (k !== "documents") walk(o[k]);
    }
  }
  walk(x);
  assert.ok(removed);
  assert.throws(() => plan(x));
});

test("Les signes qui changent le sens ne disparaissent pas", () => {
  assert.notEqual(normalize("Travaux A+B"), normalize("Travaux A-B"));
});

test("Erreur de fournisseur : revue explicite, contrôles exacts conservés", async () => {
  const x = clone(corpus[0].input);
  const provider = {
    async decide() {
      throw new TypeError("Réponse incorrecte");
    },
  };
  await assert.rejects(analyze(x, { mode: "jev", provider }), /incorrecte/);
  const report = await analyze(x, {
    mode: "jev",
    provider,
    onProviderError: "review",
  });
  assert.equal(report.providerError.usageKnown, false);
  assert.ok(
    report.findings.some(
      (f) => f.method === "erreur_fournisseur" && f.status === "a_revoir",
    ),
  );
  assert.ok(report.findings.some((f) => f.method === "code"));
});
test("L’annulation ne devient jamais une revue silencieuse", async () => {
  const controller = new AbortController();
  const provider = {
    async decide() {
      controller.abort(new Error("annulation explicite"));
      throw new Error("erreur");
    },
  };
  await assert.rejects(
    analyze(corpus[0].input, {
      mode: "jev",
      provider,
      signal: controller.signal,
      onProviderError: "review",
    }),
    /annulation explicite/,
  );
});

test('caller edits during an async decision cannot change captured evidence or numeric outputs',async()=>{
 const input=clone(corpus.find(c=>c.input.annotation.fields.some(f=>f.kind==='text')).input);
 const field=input.annotation.fields.find(f=>f.kind==='text');input.extraction.fields[field.key]='distinct extracted text';
 let release,entered;const ready=new Promise(resolve=>{entered=resolve;}),gate=new Promise(resolve=>{release=resolve;});
 const pending=analyze(input,{mode:'jev',provider:{async decide({questions}){entered();await gate;return {model:MODEL,answers:Object.fromEntries(Object.keys(questions).map(id=>[id,{type:'choice',choice:'a_revoir',confidence:.9,probabilities:{etaye:.05,ecart:.05,a_revoir:.9}}])),usage:{input_tokens:1,output_tokens:0}};}}});
 await ready;const original=input.documents[0].text;input.documents[0].text='caller changed after dispatch';input.annotation.fields[0].value=input.annotation.fields[0].value;
 release();const result=await pending;assert.ok(result.findings.flatMap(f=>f.evidence).some(e=>e.quote===original));assert.ok(result.findings.every(f=>f.evidence.every(e=>e.quote!=='caller changed after dispatch')));
});

test('provider cannot redefine the expected judgment contract through received questions',async()=>{
 const item=corpus.find(c=>plan(c.input).pairs.some(f=>f.left.trim()&&f.right.trim()&&normalize(f.left)!==normalize(f.right)));
 const provider={async decide(request){
  for(const question of Object.values(request.questions))question.criteria.invented='provider controlled';
  return {model:MODEL,answers:Object.fromEntries(Object.keys(request.questions).map(id=>[id,{type:'choice',choice:'invented',confidence:1,probabilities:{etaye:0,ecart:0,a_revoir:0,invented:1}}])),usage:{input_tokens:1,output_tokens:0}};
 }};
 await assert.rejects(analyze(item.input,{mode:'jev',provider}),/invalide/);
});
test('report probabilities and usage remain independent of retained provider response objects',async()=>{
 const item=corpus.find(c=>plan(c.input).pairs.some(f=>f.left.trim()&&f.right.trim()&&normalize(f.left)!==normalize(f.right)));
 let response;
 const report=await analyze(item.input,{mode:'jev',provider:{async decide(request){response={model:MODEL,answers:Object.fromEntries(Object.keys(request.questions).map(id=>[id,{type:'choice',choice:'etaye',confidence:.95,probabilities:{etaye:.96,ecart:.02,a_revoir:.02}}])),usage:{input_tokens:7,output_tokens:0}};return response;}}});
 const before=JSON.stringify(report);response.usage.input_tokens=999;for(const answer of Object.values(response.answers))answer.probabilities.etaye=0;
 assert.equal(JSON.stringify(report),before);
});
