# Acervo

Acervo pessoal de estudos, feito com [Astro Starlight](https://starlight.astro.build).

```bash
npm install
npm run dev     # http://localhost:4321
npm run build   # gera o site em dist/
```

As notas ficam em `src/content/docs/<área>/<tecnologia>/`. O template e as regras de escrita estão no [CLAUDE.md](CLAUDE.md).

## Skills do Claude Code

A pasta `skills/` tem skills que usam as notas do acervo como fonte. Por exemplo, a `review-app-conventions` revisa um app contra as [Leis de arquitetura](src/content/docs/mobile/react-native/arquitetura/leis-de-arquitetura.md).

Para instalar num computador novo, clone o acervo e crie um link de cada skill em `~/.claude/skills/`. Com um link, e não uma cópia, um `git pull` no acervo já atualiza a skill.

No Windows (PowerShell, sem precisar de admin):

```powershell
New-Item -ItemType Junction -Path "$env:USERPROFILE\.claude\skills\review-app-conventions" -Target "<caminho do acervo>\skills\review-app-conventions"
```

No macOS ou Linux:

```bash
ln -s "<caminho do acervo>/skills/review-app-conventions" ~/.claude/skills/review-app-conventions
```

A skill é instalada no usuário, e não no projeto: ela funciona em qualquer projeto daquele computador.
