# Text for Shabari to check, by stage

Every sentence a stage adds that isn't her own approved wording (her dopamine lesson,
`src/app/(site)/dopamine/page.tsx` and `src/lib/lessons/dopamine-page.ts`, or `src/lib/founder-facts.ts`,
or copy already live on the site). Verbatim, with where it appears. Other stages add their own
sections on their own branches.

## Stage 1: homepage (/)

Everything else in the five acts is her wording: the hero (eyebrow, headline, subline, CTAs, lesson
link, credibility strip), the lesson sections quoted in the Specimen and Synapse panels, Q6 and Q2
with their explanations, the 522 and her three section scores, her bio line, the tutoring points and
the payment note.

### New science sentences and labels (short, MCAT-level; please confirm or correct)

| Text, verbatim | Where |
|---|---|
| "of the amine carries the proton. Net charge from the amine ≈ +1." (after a computed percentage, e.g. "99.7%") | Act 4, the pH explorer, shown only after Q6 is answered |
| "Fraction protonated = 1 / (1 + 10^(pH − pKa)). Below the pKa, most of the amine is protonated." | Act 4, under the pH explorer's curve |
| "Answer first. Then you can move the pH and watch the amine take or lose its proton." | Act 4, placeholder before Q6 is answered |
| "pH 7.4 (blood)" (a button that resets the slider) | Act 4, pH explorer |
| "–OH: the second of two adjacent –OH groups" | Act 1, the Specimen's exploded-view legend (from her "benzene with two adjacent –OH groups") |
| "–OH: added by tyrosine hydroxylase" | Act 1, legend and 3D label (the live home's existing model label "Added by tyrosine hydroxylase") |
| "Benzene ring: the catechol ring" | Act 1, legend and 3D label |
| "Ethylamine side chain: its amine (pKa ≈ 10) is protonated at physiological pH" | Act 1, legend (her sentence, shortened) |
| 3D label "–CH₂–CH₂–N" under "Ethylamine side chain" | Act 1, exploded view |
| 3D label "–NH₃⁺ · pKa ≈ 10, +1 at pH 7.4" | Act 1, the charge beat (her numbers; "pH 7.4" is from her Q6) |
| 3D label "Achiral" on the two CH₂ carbons | Act 1, the achiral beat (her word) |
| "Stylized and not to scale." | Act 2, the Receptors panel |
| 3D labels "Presynaptic terminal", "Synaptic cleft", "Postsynaptic neuron", "D1 · Gs · cAMP ↑", "D2 · Gi · cAMP ↓", "DAT" | Act 2, over the synapse scene |
| Diagram labels "Presynaptic", "Postsynaptic", "cleft", "D1 · Gs", "D2 · Gi", "cAMP ↑", "cAMP ↓", "DAT" | Act 2, the still diagrams (WebGL off, reduced motion) |
| Diagram descriptions: "Synapse diagram: vesicles of dopamine in the presynaptic terminal"; "Synapse diagram: dopamine at D1 and D2 receptors, with cAMP up beside D1 and down beside D2"; "Synapse diagram: dopamine returning through the dopamine transporter" | Act 2, screen-reader text of the still diagrams |

### Removed or replaced in Stage 1 (were mine, now gone)

| Was | Now |
|---|---|
| "Dopamine is made in the presynaptic terminal and stored in synaptic vesicles." | Her section 2 list, "How it’s made (catecholamine synthesis)", verbatim |
| "An action potential reaches the terminal. Calcium (Ca²⁺) flows in, and a vesicle fuses with the membrane, releasing dopamine into the synaptic cleft." | Removed. The scene shows release between beats, with no caption; the still diagrams no longer say "action potential" or "Ca²⁺" |
| "Dopamine diffuses across the synaptic cleft to receptors on the next neuron." | Removed (no caption between "How it’s made" and "Receptors") |
| "…molecules are drawn far larger than life, and D1 and D2 sit side by side for comparison (in the striatum they are mostly on different neurons)." | "Stylized and not to scale." |
| 3D label "Vesicles of dopamine" | Removed |
| "At pH 7.4 with pKa 10, about 99.7% of the amine is protonated: 1 / (1 + 10^(pH − pKa))." | Removed from the Specimen (the pH explorer in act 4 keeps the computed value) |
| "A stereocenter needs a carbon with four different groups. Both side-chain carbons are CH₂, and the ring carbons have only three neighbours, so there is none." and the label "both side-chain carbons are CH₂: no stereocenter" | Removed; her "Dopamine itself is achiral." stays |
| "4-OH: already on tyrosine" / "3-OH" | "–OH" (see above) |

### Interface copy (not science; listed so nothing is unseen)

"Four parts, one molecule"; "Each part moves out along the bond that joins it to the ring. Dashed
lines are the broken bonds."; "Check your understanding"; "One of Shabari’s six dopamine questions.
Pick an answer to see her explanation."; "How sure are you? (optional)" with "Sure", "Unsure",
"Guessing"; the four notes after answering ("You were sure, and you were right."; "You said
“unsure”, and you were right. Worth trusting that reasoning."; "You were sure, but this one went the
other way. Those are the best ones to revisit."; "You said “guessing”. Now you know why."); "Try a
related question"; "A related question from her set"; "What you learned"; "1 of 2 right. The other
four questions are in the free lesson."; "Block DAT"; "Turn it on to stop reuptake."; "In the free
lesson:"; "Section scores"; "One-on-one"; "Clear, simple, built around you" (her phrase); the
placard "Specimen · Dopamine, C₈H₁₁NO₂ · 153.18 g/mol · Atom positions from PubChem’s 3D conformer
(CID 681)" (the live hero's existing caption); "Turn the molecule left/right", "Tilt", "Reset", "or
drag it".


## Stage 2: neural signaling explorer (/explore/signaling)

Reuses Shabari's approved dopamine lesson wording (`LESSON` in `src/lib/explore/signaling-copy.ts`).
Every new sentence and question written for `/explore/signaling` is logged verbatim below:

### New science sentences (`NEW` in `src/lib/explore/signaling-copy.ts`)

- "Dopamine: One Molecule, Every MCAT Section"
- "D1-like (D1, D5): Gs-coupled → ↑ adenylyl cyclase → ↑ cAMP."
- "D2-like (D2, D3, D4): Gi-coupled → ↓ cAMP."
- "Reuptake by the dopamine transporter (DAT), then breakdown by MAO and COMT. The main metabolite is homovanillic acid (HVA)."
- "Cocaine blocks DAT; amphetamine reverses DAT and releases dopamine. Both raise synaptic dopamine in the mesolimbic pathway."
- "Pick an answer to see the explanation."
- "Want to go deeper? Book a free consult call."
- "An interactive explorer of how neurons signal: the action potential, myelin, the Na⁺/K⁺-ATPase and the synapse, with three MCAT-style questions."
- "Fire an action potential, send it down an axon, then follow the signal across a synapse."
- "A neuron at rest sits at about −70 mV, negative inside. A stimulus that brings the membrane to threshold, about −55 mV, fires an action potential."
- "Threshold needs a 15 mV depolarization from rest."
- "Set a stimulus strength, then press Stimulate."
- "Below threshold. The membrane reached {v}, short of −55 mV, so no action potential fired."
- "Threshold reached. An action potential fired and peaked at +35 mV."
- "Every action potential is the same size. A stronger stimulus doesn’t make a bigger one."
- "The second stimulus came during the absolute refractory period. Na⁺ channels were inactivated, so nothing fired."
- "The second stimulus came during the relative refractory period and was too weak. Try a stronger stimulus."
- "The second stimulus came during the relative refractory period. It was strong enough, so a second action potential fired."
- "The second stimulus came after the refractory periods, so a second action potential fired."
- "Neither stimulus reached threshold alone, but the second arrived before the first had faded. Together they reached threshold (temporal summation)."
- "The second stimulus didn’t reach threshold either."
- "At rest, voltage-gated Na⁺ and K⁺ channels are closed. The Na⁺/K⁺-ATPase keeps Na⁺ high outside the cell and K⁺ high inside."
- "Voltage-gated Na⁺ channels open. Na⁺ rushes in, and the inside of the membrane becomes positive."
- "Na⁺ channels inactivate, and voltage-gated K⁺ channels open. K⁺ flows out, and the membrane repolarizes."
- "K⁺ channels are slow to close, so the membrane briefly dips below rest."
- "Fire an action potential to step through its phases."
- "Absolute refractory period: no stimulus, however strong, can fire another action potential, because Na⁺ channels are open or inactivated."
- "Relative refractory period: a stronger-than-normal stimulus can fire one, because the membrane is hyperpolarized."
- "Myelin insulates the axon. The action potential is regenerated only at the gaps between myelin, the nodes of Ranvier, so it jumps from node to node. This is saltatory conduction, and it is faster."
- "Oligodendrocytes make myelin in the CNS; Schwann cells make it in the PNS."
- "Myelin on: the action potential jumps from node to node."
- "Myelin off: the action potential is regenerated along every patch of membrane, so it travels more slowly."
- "Arrived at the end. Jumping from node to node, it got there sooner."
- "Arrived at the end. Without myelin, it took longer."
- "Slowed down and stylized. It shows which is faster, not by how much."
- "For each ATP it uses, the Na⁺/K⁺-ATPase pumps 3 Na⁺ out and 2 K⁺ in. It keeps up the gradients that every action potential depends on."
- "It doesn’t repolarize the membrane after each action potential. K⁺ flowing out does that."
- "Three Na⁺ bind from inside the cell, and ATP phosphorylates the pump."
- "The pump changes shape and releases the 3 Na⁺ outside. Two K⁺ bind from outside."
- "The phosphate comes off, the pump changes back, and the 2 K⁺ are released inside."
- "At the axon terminal, the electrical signal becomes a chemical one. The example here is dopamine."
- "The action potential reaches the axon terminal and opens voltage-gated Ca²⁺ channels. Ca²⁺ flows in."
- "Ca²⁺ triggers synaptic vesicles to fuse with the membrane and release neurotransmitter into the synaptic cleft (exocytosis)."
- "Dopamine diffuses across the synaptic cleft to receptors on the next neuron."
- "Dopamine receptors are metabotropic: they act through G proteins."
- "Stylized and not to scale."
- "Ionotropic receptors are ligand-gated ion channels. Binding opens the channel, and ions flow within milliseconds: fast."
- "Example: the nicotinic acetylcholine receptor, which lets Na⁺ into the cell."
- "Metabotropic receptors act through G proteins and second messengers such as cAMP. They are slower, and their effects last longer."
- "Example: dopamine’s D1 (Gs) and D2 (Gi) receptors."
- "No neurotransmitter bound: the channel is closed and the G protein is inactive."
- "Neurotransmitter bound: the ion channel opens at once; the G protein is activated and passes the signal on."
- "Reuptake: a transporter carries the neurotransmitter back into the presynaptic terminal."
- "Example: the dopamine transporter (DAT)."
- "Enzymatic breakdown: an enzyme in the synaptic cleft breaks the neurotransmitter down."
- "Example: acetylcholinesterase splits acetylcholine into acetate and choline."
- "Three MCAT-style questions."

### Headings on `/explore/signaling`

- "How neurons signal, from threshold to synapse."
- "Resting potential, threshold, and all-or-none firing."
- "Myelin, nodes of Ranvier, and saltatory conduction."
- "The Na⁺/K⁺-ATPase pump: 3 Na⁺ out, 2 K⁺ in."
- "From electrical impulse to neurotransmitter release."
- "Ionotropic vs. metabotropic receptors."

### Knowledge check questions (`SIGNALING_QUESTIONS` in `src/lib/explore/signaling-questions.ts`)

- Q1 stem: "A stimulus depolarizes a resting neuron from −70 mV to −60 mV. If threshold is −55 mV, what happens?"
  - Explanation: "Action potentials are all-or-none. Below threshold, too few voltage-gated Na⁺ channels open, and the small depolarization fades."
- Q2 stem: "A second stimulus arrives while the neuron’s voltage-gated Na⁺ channels are inactivated. The second stimulus:"
  - Explanation: "This is the absolute refractory period. Inactivated Na⁺ channels can’t open again until the membrane repolarizes, so no stimulus can fire another action potential."
- Q3 stem: "A toxin blocks voltage-gated Ca²⁺ channels in the axon terminal. Which step is directly prevented?"
  - Explanation: "Ca²⁺ entering the terminal triggers vesicles to fuse with the membrane. Without it, the action potential still arrives, but no neurotransmitter is released."
- Choices: "A smaller action potential fires", "A full-size action potential fires", "No action potential fires", "The neuron fires a burst of action potentials", "fires an action potential if it is strong enough", "cannot fire an action potential", "fires a larger action potential", "hyperpolarizes the membrane", "Depolarization of the axon by Na⁺ entry", "Reuptake of neurotransmitter", "Binding of neurotransmitter to its receptors", "Vesicle fusion and neurotransmitter release"
