# Contract — Facteur YEn annuel

## Autorité

Source normative : équation (9) fournie par le demandeur le 2026-08-27.

- Source ID : `SRC-USER-ANNUAL-YEN-EQ9`
- Formule locale existante : `CALC-P1-011`
- Dénombrement et poids annuels proposés : `CALC-P1-012`
- Agrégation annuelle proposée : `CALC-P1-013`

Ces identifiants sont soumis à approbation avant implémentation.

## Définitions

- `P` : ensemble des périodes configurées ;
- `T` : ensemble des types de jour ;
- `N[p,τ]` : nombre de jours du type `τ` dans la période `p` pour le calendrier météo ;
- `Eload,T,p,τ` : énergie totale d’une journée type de la combinaison, en Wh ;
- `Eload,f,p,τ` : énergie favorable quotidienne moyenne observée sur les jours
  réels de cette combinaison, en Wh ;
- `γ[p,τ] = Eload,f,p,τ / Eload,T,p,τ` lorsque le dénominateur est positif ;
- `W[p,τ] = N[p,τ] × Eload,T,p,τ`, poids énergétique annuel en Wh.

## Équation normative

```text
γannual
  = Σp∈P Στ∈T N[p,τ] × Eload,f,p,τ
    ─────────────────────────────────────
    Σp∈P Στ∈T N[p,τ] × Eload,T,p,τ

  = Σp∈P Στ∈T W[p,τ] × γ[p,τ]
    ─────────────────────────────────
              Σp∈P Στ∈T W[p,τ]
```

## Règle favorable locale sur la météo annuelle

Soit `D[p,τ]` l’ensemble des dates appartenant à la combinaison et `h` l’heure
locale. Le profil de charge est journalier, mais la POA provient de chaque date
réelle de la série météo :

```text
Eload,f,d = Σh Eload,p,τ,h × indicator(POA[d,h] >= irMin)

Eload,f,p,τ = (1 / N[p,τ]) × Σd∈D[p,τ] Eload,f,d
Eload,T,p,τ = Σh Eload,p,τ,h
```

Ainsi, `N[p,τ] × Eload,f,p,τ` reconstitue exactement l’énergie favorable annuelle
de la combinaison. Pour `N[p,τ] = 0`, la contribution a un poids nul et ne calcule
pas de division locale. Le calcul ne doit pas revenir à une POA moyenne globale
de 24 heures qui effacerait les variations entre dates et périodes.

## Invariants

1. `0 <= γ[p,τ] <= 1` et `0 <= γannual <= 1`.
2. Une seule combinaison positive donne `γannual = γ[p,τ]`.
3. Multiplier toutes les énergies par une constante positive ne change pas `γannual`.
4. Une combinaison de poids nul ne modifie pas l’agrégat et est tracée comme telle.
5. Un dénominateur annuel nul produit `unavailable: LOAD_ENERGY_ZERO`.
6. La somme des `N[p,τ]` égale le nombre de jours du calendrier de référence.
7. L’arrondi n’est appliqué qu’à l’affichage.

## Trace minimale

Le résultat public expose `formulaId`, `sourceId`, `inputHash`, seuil POA,
calendrier/fuseau, contributions locales, numérateur et dénominateur non arrondis.
