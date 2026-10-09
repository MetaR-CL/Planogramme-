import { expect, test } from '@playwright/test';
const legacyProject = {
  articles: [
    {
      id: 'legacy-article',
      name: 'Article conservé',
      cat: 'boissons',
      tpl: null,
      w: 6.6,
      h: 11.5,
      d: 6.6,
      buy: 1,
      sell: 2,
      sales: 10,
      shape: null,
      img: null,
    },
  ],
  tpls: [],
  shelves: [
    {
      id: 'legacy-shelf',
      name: 'Meuble conservé',
      cats: ['boissons'],
      width: 100,
      levels: [
        { id: 'bottom', h: 40, zone: null },
        { id: 'top', h: 40, zone: null },
      ],
      place: {
        bottom: [{ uid: 'old-placement', aid: 'legacy-article', f: 2 }],
        top: [],
      },
    },
  ],
  activeShelfId: 'legacy-shelf',
};
const pageErrors = new WeakMap<import('@playwright/test').Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Articles', exact: true }),
  ).toBeVisible();
});
test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});
const planogram = async (page: import('@playwright/test').Page) => {
  await page.getByRole('button', { name: '03 Planogramme' }).click();
  await expect(
    page.getByRole('heading', {
      name: 'Boissons & petit-déjeuner',
      exact: true,
    }),
  ).toBeVisible();
};

test('contrôle les dimensions, conserve un nouvel EAN et retrouve l’article après rechargement', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Ajouter un article' }).click();
  await page.getByLabel('Nom de l’article').fill('Produit de test');
  await page.getByLabel('Largeur (cm)', { exact: true }).fill('0');
  await page.getByLabel('Prix d’achat HT (€)').fill('2,10');
  await page.getByLabel('Prix de vente HT (€)').fill('3,90');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('dimension');
  await expect(
    page.getByRole('heading', { name: 'Nouvel article' }),
  ).toBeVisible();
  await page.getByLabel('Largeur (cm)', { exact: true }).fill('8');
  await page.getByLabel('Code EAN / GTIN').fill('3017620422003');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByText('Enregistré sur cet appareil')).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Articles', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Rechercher un article' })
    .fill('3017620422003');
  await expect(
    page.getByText('Produit de test', { exact: true }),
  ).toBeVisible();
});

test('présente un import CSV et Excel avant de l’appliquer', async ({
  page,
}) => {
  const csv =
    'nom;categorie;ean;largeur;hauteur;profondeur;achat_ht;vente_ht;ventes_semaine;promotion\nImport CSV;boissons;3017620422003;8;12;8;2,1;3,9;12;oui\n';
  await page
    .locator('input[accept=".csv,.tsv,.xlsx"]')
    .setInputFiles({
      name: 'catalogue.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv),
    });
  await expect(page.getByRole('dialog')).toContainText('1 lignes');
  await expect(page.getByRole('dialog')).toContainText('Import CSV');
  await page.getByRole('button', { name: 'Confirmer l’import' }).click();
  await page
    .getByRole('textbox', { name: 'Rechercher un article' })
    .fill('Import CSV');
  await expect(page.getByText('Import CSV', { exact: true })).toBeVisible();
  await page
    .locator('input[accept=".csv,.tsv,.xlsx"]')
    .setInputFiles('tests/fixtures/catalogue.xlsx');
  await expect(page.getByRole('dialog')).toContainText('Import Excel');
  await page.getByRole('button', { name: 'Confirmer l’import' }).click();
  await page
    .getByRole('textbox', { name: 'Rechercher un article' })
    .fill('Import Excel');
  await expect(page.getByText('Import Excel', { exact: true })).toBeVisible();
});

test('annule un déplacement au clavier, vérifie le dépassement et calcule une proposition', async ({
  page,
}) => {
  await planogram(page);
  const cola = page.getByRole('button', {
    name: 'Coca-Cola 33 cl, 6 côte à côte',
    exact: true,
  });
  await cola.focus();
  await cola.press('Enter');
  await expect(page.getByLabel('Déplacer vers')).toHaveValue('s1c');
  await cola.press('ArrowUp');
  await expect(page.getByLabel('Déplacer vers')).toHaveValue('s1d');
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await cola.focus();
  await cola.press('Enter');
  await expect(page.getByLabel('Déplacer vers')).toHaveValue('s1c');
  await page.getByLabel('Déplacer vers').selectOption('s1b');
  await expect(page.getByRole('dialog')).toContainText('Dépassement');
  await page.getByRole('button', { name: 'Revenir au placement' }).click();
  await expect(page.getByLabel('Déplacer vers')).toHaveValue('s1c');
  await page.getByRole('button', { name: 'Proposer un rangement' }).click();
  await page.getByRole('button', { name: 'Calculer la proposition' }).click();
  await expect(
    page.getByRole('button', { name: 'Appliquer cette proposition' }),
  ).toBeVisible();
  await expect(page.locator('.score-num')).toHaveText('36');
  await page
    .getByRole('button', { name: 'Appliquer cette proposition' })
    .click();
  await expect(
    page.getByRole('button', { name: /Niveau .* saturé/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Alertes · 1' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Augmenter le zoom' }).click();
  await expect(page.getByLabel('Zoom', { exact: true })).toHaveText('125 %');
  await page.getByRole('button', { name: 'Ajuster', exact: true }).click();
  await expect(page.getByLabel('Zoom', { exact: true })).toHaveText('100 %');
});

test('conserve une version et annule sa restauration après duplication', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Versions', exact: true }).click();
  await page.getByLabel('Nom de la version').fill('Implantation actuelle');
  await page.getByRole('button', { name: 'Conserver cette version' }).click();
  await expect(page.getByRole('dialog')).toContainText('Implantation actuelle');
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await page.getByRole('button', { name: '02 Étagères' }).click();
  await page
    .getByRole('button', { name: 'Dupliquer', exact: true })
    .first()
    .click();
  await expect(
    page.getByRole('heading', { name: 'Boissons & petit-déjeuner · copie' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Versions', exact: true }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Restaurer', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Boissons & petit-déjeuner · copie' }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Boissons & petit-déjeuner · copie' }),
  ).toBeVisible();
});

test('rend l’éditeur sur téléphone sans débordement et ouvre les propriétés', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Planogramme', exact: true }).click();
  await expect(
    page.getByRole('heading', {
      name: 'Boissons & petit-déjeuner',
      exact: true,
    }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
  const cola = page.getByRole('button', {
    name: 'Coca-Cola 33 cl, 6 côte à côte',
    exact: true,
  });
  await cola.focus();
  await cola.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Article sélectionné' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Fermer les propriétés' }).click();
  await expect(
    page.getByRole('heading', { name: 'Article sélectionné' }),
  ).toHaveCount(0);
});

test('exporte une sauvegarde complète et produit une fiche imprimable', async ({
  page,
}) => {
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Enregistrer une sauvegarde' })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/etal-sauvegarde-.*\.json/);
  await page.getByRole('button', { name: '04 Impression' }).click();
  await expect(page.getByText('Version : Brouillon')).toBeVisible();
  await expect(
    page.getByRole('columnheader', { name: 'Qté max.' }),
  ).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  const pdf = await page.pdf({
    format: 'A4',
    landscape: true,
    preferCSSPageSize: true,
  });
  expect(pdf.length).toBeGreaterThan(10000);
});

test('relit les anciennes données locales puis les conserve dans IndexedDB', async ({
  page,
}) => {
  await page.goto('about:blank');
  await page.addInitScript(
    (value) => localStorage.setItem('etal-v2', value),
    JSON.stringify({ version: 2, state: legacyProject }),
  );
  await page.goto('/');
  await expect(
    page.getByText('Article conservé', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '03 Planogramme' }).click();
  const article = page.getByRole('button', {
    name: 'Article conservé, 2 côte à côte',
  });
  await article.focus();
  await article.press('Enter');
  await page
    .getByRole('button', { name: 'Augmenter : facings', exact: true })
    .click();
  await expect(page.getByText('Enregistré sur cet appareil')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: '03 Planogramme' }).click();
  await expect(
    page.getByRole('button', { name: 'Article conservé, 3 côte à côte' }),
  ).toBeVisible();
});

test('valide une sauvegarde avant remplacement et permet d’annuler l’import', async ({
  page,
}) => {
  const input = page.locator('input[accept="application/json"]');
  await input.setInputFiles({
    name: 'invalide.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"articles":[],"shelves":[{}]}'),
  });
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('27 articles', { exact: false })).toBeVisible();
  await input.setInputFiles({
    name: 'ancienne-sauvegarde.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(legacyProject)),
  });
  await expect(page.getByRole('dialog')).toContainText('1 articles');
  await page.getByRole('button', { name: 'Remplacer le projet' }).click();
  await expect(
    page.getByText('Article conservé', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(page.getByText('27 articles', { exact: false })).toBeVisible();
});

test('propose la saisie manuelle lorsque la caméra est refusée', async ({
  page,
}) => {
  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(new DOMException('Refus', 'NotAllowedError'));
  });
  await page.getByRole('button', { name: 'Scanner', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(
    'saisissez le code manuellement',
  );
  await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Rechercher un article' }),
  ).toBeVisible();
});
