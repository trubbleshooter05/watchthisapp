import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { EditorialAttribution } from "@/components/EditorialAttribution";
import { getProjectFileMtimeIso } from "@/lib/editorial-meta";
import { getSiteUrl } from "@/lib/site-url";

const pagePath = "src/app/best-brutal-gory-horror-movies/page.tsx";
const pageUpdatedIso = getProjectFileMtimeIso(pagePath);

export const metadata: Metadata = {
  title: "20 Brutal, Gory Horror Movies That Don’t Wink at the Camera",
  description:
    "A straight shot through extreme horror: practical gore, moral nausea, and set pieces you’ll remember in the shower. No ranking noise—20 films for viewers who like their fear wet.",
  alternates: { canonical: `${getSiteUrl()}/best-brutal-gory-horror-movies` },
  robots: { index: true, follow: true },
  openGraph: {
    title: "20 Brutal, Gory Horror Movies That Don’t Wink at the Camera",
    description:
      "A straight shot through extreme horror: practical gore, moral nausea, and set pieces you’ll remember in the shower. 20 films for viewers who like their fear wet.",
    type: "article",
    url: `${getSiteUrl()}/best-brutal-gory-horror-movies`,
  },
};

function InlineLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-amber-500 hover:text-amber-400 underline-offset-2 hover:underline transition-colors"
    >
      {children}
    </Link>
  );
}

const picks: { title: string; year: number; body: string }[] = [
  {
    title: "The Texas Chain Saw Massacre",
    year: 1974,
    body: "Tobe Hooper’s sweat-stain masterpiece barely shows blood on screen—the editing and sound sell dismemberment so fiercely you think you’ve seen more than you have. A humid nightmare about a family of smiles that don’t fit right.",
  },
  {
    title: "The Evil Dead",
    year: 1981,
    body: "Raimi at full feral: viscous, invasive, and funny only if your sense of humor is already broken. The cabin is a meat grinder; the camera is a predator. Still the blueprint for ‘throw the kitchen sink at the lens’ gore-comedy that isn’t winking, it’s barking.",
  },
  {
    title: "Re-Animator",
    year: 1985,
    body: "Lovecraft as neon splatter operetta. Jeffrey Combs’ Herbert West is manic competence without a soul; the practical effects are wet, janky, and unforgettable—brains in takeout boxes, the whole nine yards of B-movie excess with A-level commitment.",
  },
  {
    title: "The Fly",
    year: 1986,
    body: "Body horror with a breakup at its center. Cronenberg turns biology into a slow-motion car crash: skin, hair, and appetite betraying you in close-up. The gore is intimate—more break-your-heart than splatter-for-fun, but the practical transformation scenes still peel off the wall.",
  },
  {
    title: "The Thing",
    year: 1982,
    body: "Carpenter’s arctic paranoia and Rob Bottin’s creature shop meet in a film where trust rots before the body does. The gore is surgical—anatomy rewrites itself in front of the flame thrower, and the cold outside stops mattering when the person beside you might be teeth.",
  },
  {
    title: "Braindead (Dead Alive)",
    year: 1992,
    body: "Jackson before Middle-earth, turning a lawnmower into a punchline the way only Kiwis can. Gooey, juvenile, and cartoon-violent, but the volume is so unhinged it becomes its own art form: if you can finish the final act without flinching, you’ve earned a shower.",
  },
  {
    title: "Ichi the Killer",
    year: 2001,
    body: "Miike’s yakuza fever dream: wires of vulnerability stretched across ultraviolent slapstick. It’s repulsive, funny, and strangely fragile—cruelty as fashion, and blood as the only color that still reads as honest.",
  },
  {
    title: "High Tension",
    year: 2003,
    body: "Aja’s French firecracker that plays domestic invasion like a siren. The opening stretch is a vice-grip; the practical mess feels cruel in the best/worst way. (If you need one rule: go in cold, argue about the twist after.)",
  },
  {
    title: "Hostel",
    year: 2005,
    body: "Roth’s backpacker abattoir isn’t subtle about capitalism, tourism, and who gets treated as ‘inventory.’ The gore is procedural—tools, restraints, an economy of screams—so the nausea lingers in your teeth after the red mist clears.",
  },
  {
    title: "Saw",
    year: 2004,
    body: "Before the franchise binged on lore, the original was a cruel little nail-biter about consequences: rusty traps, a puppet that judges you, and a finale that rewrites the room. The violence is more suggestion than smear, but the idea of choice-as-torture still cuts.",
  },
  {
    title: "Inside",
    year: 2007,
    body: "A home-invasion film so claustrophobic the walls seem to lean in. French extremity with maternal dread baked into the camera movement—stark lighting, unflinching harm, a night that won’t end until someone else’s blood cools the floor.",
  },
  {
    title: "Martyrs",
    year: 2008,
    body: "Laugier’s shocker is philosophy wrapped in laceration: suffering as currency, hope as a trap. The first half is pure sprint; the second dares to go so cold and surgical it splits audiences clean in two. This is not a ‘fun gore’ pick—it’s a dare.",
  },
  {
    title: "Antichrist",
    year: 2009,
    body: "Von Trier fuses grief and cabin isolation into something sexed, feral, and unforgiving. The gore is intimate, almost surgical in its transgression; you feel caught watching something you’re not supposed to admit you understand.",
  },
  {
    title: "Audition",
    year: 1999,
    body: "Miike lulls you with romantic comedy tempo, then the floor drops into one of the most cited third acts in gore-psych history. The harm lands because the film spent an hour making you complicit in wishful thinking—no spoilers, but you’ll know why people tap out.",
  },
  {
    title: "I Saw the Devil",
    year: 2010,
    body: "Kim Jee-woon chases a serial killer with a man who can’t stop upgrading the cruelty. The gore is relentless but purposeful—revenge that eats its user alive. The violence isn’t there to make you cheer; it’s there to make you complicit.",
  },
  {
    title: "Evil Dead",
    year: 2013,
    body: "Fede Álvarez weaponizes the cabin again with a deluge of practical red—staple guns, severed tongues, rain that only looks like weather. A remake that treats excess as a dare: can the camera and cast survive the same tempo as the audience’s stomach?",
  },
  {
    title: "Terrifier 2",
    year: 2022,
    body: "Art the Clown returns with practical splatter on a delirious budget, stretching runtime until audacity itself becomes the joke. It’s a circus of hurt for people who think mainstream slashers are too polite to touch the third rail.",
  },
  {
    title: "Midsommar",
    year: 2019,
    body: "Ari Aster trades jump scares for daylight dread and a slow, floral collapse of boundaries. The gore is ceremonial—crowds, flowers, a bear—so the horror feels like anthropology from hell. Nasty, but weirdly beautiful in its cruelty.",
  },
  {
    title: "Hereditary",
    year: 2018,
    body: "Family grief curdles into something worse than a ghost story. A single sequence mid-film rewrites the room so brutally the sound mix becomes part of the injury. Afterward, every ceiling corner feels loaded.",
  },
  {
    title: "Cannibal Holocaust",
    year: 1980,
    body: "Ruggero Deodato’s found-footage ur-text about colonial cameras and real animal harm that still roils film ethics. It’s a historically significant provocation, not a light watch—treat it as a document of extremity, not a checklist dare.",
  },
];

export default function BestBrutalGoryHorrorMoviesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-amber-500/90 text-sm font-medium mb-2">Editorial</p>
      <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-balance text-[#FAFAFA] mb-6">
        20 Brutal, Gory Horror Movies for Viewers Who Want the Rope Burn
      </h1>

      <div className="space-y-4 text-base sm:text-lg text-[#D1D5DB] text-pretty leading-relaxed mb-12">
        <p>
          This is not a ‘spooky season’ list with pumpkin spice and jump scares. It’s a roster for the crowd that
          likes horror when the camera refuses to look away: practical blood that pools instead of fizzing,
          consequences that outlast the jump, and a few famous provocations you’ll still argue about a decade
          later. We’re not ranking box-office; we’re naming films where violence is a language, and some of
          them are fluent enough to make you feel dirty for understanding.
        </p>
        <p>
          A few are genre monuments (Hooper, Carpenter, Cronenberg). Others are extremity with receipts—French
          invasion, Korean revenge, the New French Extremity wave, the splatter renaissance, and a few films
          that still start arguments in comment sections. Skim the one-liner before you press play: some entries
          are for curious adults only, and at least one is a film-school controversy piece you should only
          approach with your eyes open.
        </p>
      </div>

      <section className="mb-14" aria-labelledby="list-heading">
        <h2 id="list-heading" className="font-display text-xl sm:text-2xl font-semibold text-[#FAFAFA] mb-6">
          20 movies — gore, gravity, and zero glitter
        </h2>
        <ol className="space-y-8 list-decimal pl-5 sm:pl-6 marker:text-amber-500/90 marker:font-medium">
          {picks.map((p) => (
            <li key={`${p.title}-${p.year}`} className="pl-1">
              <p className="font-medium text-[#FAFAFA] mb-2">
                {p.title} <span className="text-[#9CA3AF] font-normal">({p.year})</span>
              </p>
              <p className="text-[#D1D5DB] leading-relaxed pl-0 sm:pl-0">{p.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <p className="text-sm text-[#6B7280] mb-8">
        More from MoviesLike: <InlineLink href="/popular">Popular movie guides</InlineLink>
        {" · "}
        <InlineLink href="/">Home</InlineLink>
      </p>

      <EditorialAttribution updatedIso={pageUpdatedIso} />
    </main>
  );
}
