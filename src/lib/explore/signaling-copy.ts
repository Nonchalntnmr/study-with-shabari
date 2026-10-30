// Every science sentence on /explore/signaling, in one place, so each one can be checked.
//
// LESSON: Shabari's own approved wording, verbatim from her dopamine lesson
// (src/app/(site)/dopamine/page.tsx). NEW: written for this page, logged verbatim in
// docs/STAGE-TEXT-FOR-SHABARI.md for her to check. tests/unit/signaling-copy.test.ts fails if a
// LESSON line isn't on her lesson page or a NEW sentence isn't in the log.

/** Her lesson, verbatim. */
export const LESSON = {
  title: "Dopamine: One Molecule, Every MCAT Section",
  d1: "D1-like (D1, D5): Gs-coupled → ↑ adenylyl cyclase → ↑ cAMP.",
  d2: "D2-like (D2, D3, D4): Gi-coupled → ↓ cAMP.",
  cleared: "Reuptake by the dopamine transporter (DAT), then breakdown by MAO and COMT. The main metabolite is homovanillic acid (HVA).",
  cocaine: "Cocaine blocks DAT; amphetamine reverses DAT and releases dopamine. Both raise synaptic dopamine in the mesolimbic pathway.",
  pick: "Pick an answer to see the explanation.",
  deeper: "Want to go deeper? Book a free consult call.",
} as const;

/** Written for this page. */
export const NEW = {
  metaDescription: "An interactive explorer of how neurons signal: the action potential, myelin, the Na⁺/K⁺-ATPase and the synapse, with three MCAT-style questions.",
  intro: "Fire an action potential, send it down an axon, then follow the signal across a synapse.",

  apLead: "A neuron at rest sits at about −70 mV, negative inside. A stimulus that brings the membrane to threshold, about −55 mV, fires an action potential.",
  strengthHint: "Threshold needs a 15 mV depolarization from rest.",
  idle: "Set a stimulus strength, then press Stimulate.",

  // Outcomes, announced after each run. {v} is a potential such as −60 mV.
  belowThreshold: "Below threshold. The membrane reached {v}, short of −55 mV, so no action potential fired.",
  fired: "Threshold reached. An action potential fired and peaked at +35 mV.",
  allOrNone: "Every action potential is the same size. A stronger stimulus doesn’t make a bigger one.",
  secondAbsolute: "The second stimulus came during the absolute refractory period. Na⁺ channels were inactivated, so nothing fired.",
  secondRelativeWeak: "The second stimulus came during the relative refractory period and was too weak. Try a stronger stimulus.",
  secondRelativeFired: "The second stimulus came during the relative refractory period. It was strong enough, so a second action potential fired.",
  secondRecovered: "The second stimulus came after the refractory periods, so a second action potential fired.",
  secondSummed: "Neither stimulus reached threshold alone, but the second arrived before the first had faded. Together they reached threshold (temporal summation).",
  secondBelow: "The second stimulus didn’t reach threshold either.",

  rest: "At rest, voltage-gated Na⁺ and K⁺ channels are closed. The Na⁺/K⁺-ATPase keeps Na⁺ high outside the cell and K⁺ high inside.",
  depolarization: "Voltage-gated Na⁺ channels open. Na⁺ rushes in, and the inside of the membrane becomes positive.",
  repolarization: "Na⁺ channels inactivate, and voltage-gated K⁺ channels open. K⁺ flows out, and the membrane repolarizes.",
  hyperpolarization: "K⁺ channels are slow to close, so the membrane briefly dips below rest.",
  stepHint: "Fire an action potential to step through its phases.",

  absolute: "Absolute refractory period: no stimulus, however strong, can fire another action potential, because Na⁺ channels are open or inactivated.",
  relative: "Relative refractory period: a stronger-than-normal stimulus can fire one, because the membrane is hyperpolarized.",

  myelinLead: "Myelin insulates the axon. The action potential is regenerated only at the gaps between myelin, the nodes of Ranvier, so it jumps from node to node. This is saltatory conduction, and it is faster.",
  myelinMakers: "Oligodendrocytes make myelin in the CNS; Schwann cells make it in the PNS.",
  myelinOn: "Myelin on: the action potential jumps from node to node.",
  myelinOff: "Myelin off: the action potential is regenerated along every patch of membrane, so it travels more slowly.",
  arrivedMyelin: "Arrived at the end. Jumping from node to node, it got there sooner.",
  arrivedBare: "Arrived at the end. Without myelin, it took longer.",
  speedNote: "Slowed down and stylized. It shows which is faster, not by how much.",

  pumpLead: "For each ATP it uses, the Na⁺/K⁺-ATPase pumps 3 Na⁺ out and 2 K⁺ in. It keeps up the gradients that every action potential depends on.",
  pumpNot: "It doesn’t repolarize the membrane after each action potential. K⁺ flowing out does that.",
  pump1: "Three Na⁺ bind from inside the cell, and ATP phosphorylates the pump.",
  pump2: "The pump changes shape and releases the 3 Na⁺ outside. Two K⁺ bind from outside.",
  pump3: "The phosphate comes off, the pump changes back, and the 2 K⁺ are released inside.",

  synapseLead: "At the axon terminal, the electrical signal becomes a chemical one. The example here is dopamine.",
  synCalcium: "The action potential reaches the axon terminal and opens voltage-gated Ca²⁺ channels. Ca²⁺ flows in.",
  synRelease: "Ca²⁺ triggers synaptic vesicles to fuse with the membrane and release neurotransmitter into the synaptic cleft (exocytosis).",
  synDiffuse: "Dopamine diffuses across the synaptic cleft to receptors on the next neuron.",
  synBind: "Dopamine receptors are metabotropic: they act through G proteins.",
  scaleNote: "Stylized and not to scale.",

  ionotropic: "Ionotropic receptors are ligand-gated ion channels. Binding opens the channel, and ions flow within milliseconds: fast.",
  ionotropicExample: "Example: the nicotinic acetylcholine receptor, which lets Na⁺ into the cell.",
  metabotropic: "Metabotropic receptors act through G proteins and second messengers such as cAMP. They are slower, and their effects last longer.",
  metabotropicExample: "Example: dopamine’s D1 (Gs) and D2 (Gi) receptors.",
  unbound: "No neurotransmitter bound: the channel is closed and the G protein is inactive.",
  bound: "Neurotransmitter bound: the ion channel opens at once; the G protein is activated and passes the signal on.",

  reuptake: "Reuptake: a transporter carries the neurotransmitter back into the presynaptic terminal.",
  reuptakeExample: "Example: the dopamine transporter (DAT).",
  enzymatic: "Enzymatic breakdown: an enzyme in the synaptic cleft breaks the neurotransmitter down.",
  enzymaticExample: "Example: acetylcholinesterase splits acetylcholine into acetate and choline.",

  quizLead: "Three MCAT-style questions.",
} as const;

/** Fill a {v} placeholder with a potential, written the way the page writes them (−60 mV, +35 mV). */
export function mv(v: number): string {
  const r = Math.round(v);
  return `${r < 0 ? "−" : r > 0 ? "+" : ""}${Math.abs(r)} mV`;
}
