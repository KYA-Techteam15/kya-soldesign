const foundations = [
  'Moteur TypeScript pur et traçable',
  'Specs versionnées avec Spec Kit',
  'Tests autonomes à chaque phase',
  'Aucun calcul simulé en production',
] as const;

export function App() {
  return (
    <main className="foundation" data-testid="foundation-screen">
      <p className="eyebrow">KYA SolDesign Next</p>
      <h1>Fondation de production prête</h1>
      <p className="lede">
        Le design validé sera adopté sans importer le moteur simulé du prototype.
      </p>
      <ul>
        {foundations.map((foundation) => <li key={foundation}>{foundation}</li>)}
      </ul>
      <p className="status" role="status">Aucun résultat de dimensionnement n’est encore calculé.</p>
    </main>
  );
}

