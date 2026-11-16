"""Única trava do MEIA.

O MEIA não tem filtro de conteúdo geral: o safety checker dos modelos vem
desligado e nenhum tema é bloqueado — com UMA exceção, que não é opcional:
conteúdo sexual envolvendo menores de idade. Isso é crime (abuso sexual
infantil) em praticamente todos os países, inclusive quando a imagem é gerada
por IA, e não é algo que eu vou ajudar a produzir.

A checagem é estreita de propósito: só bloqueia quando o prompt combina
termos de menoridade com termos sexuais/nudez. "Criança brincando no parque"
passa; "mulher adulta nua" passa.
"""

import re
import unicodedata

_MINOR_TERMS = [
    r"child", r"children", r"kid", r"kids", r"toddler", r"infant", r"baby",
    r"minor", r"underage", r"under[\s-]?age", r"preteen", r"pre[\s-]?teen",
    r"teen", r"teens", r"teenager", r"young(?:er)? girl", r"young(?:er)? boy",
    r"little girl", r"little boy", r"schoolgirl", r"schoolboy", r"loli\w*",
    r"shota\w*", r"juvenile", r"pubescent", r"prepubescent",
    r"(?:1[0-7]|[1-9])\s*(?:yo|y/o|years?\s*old|anos)",
    # português
    r"crianca\w*", r"menina\w*", r"menino\w*", r"menor(?:es)?(?: de idade)?",
    r"adolescente\w*", r"bebe\w*", r"infantil", r"novinh[ao]s?", r"garotinh[ao]s?",
    r"colegial", r"pre[\s-]?adolescente\w*",
]

_SEXUAL_TERMS = [
    r"nude", r"nudes", r"naked", r"nsfw", r"sex\w*", r"porn\w*", r"hentai",
    r"erotic\w*", r"lewd", r"explicit", r"topless", r"bottomless", r"nipples?",
    r"genital\w*", r"penis", r"vagina", r"pussy", r"breasts?", r"boobs?",
    r"lingerie", r"undress\w*", r"seductive", r"spread legs", r"cum\w*",
    r"orgasm\w*", r"masturbat\w*", r"fetish\w*", r"bdsm",
    # português
    r"nu", r"nua", r"nus", r"nuas", r"pelad[ao]s?", r"sexo", r"sexual\w*",
    r"pornografi\w*", r"erotic[ao]s?", r"seios?", r"peitos?", r"calcinha",
    r"sensual\w*", r"provocante",
]


def _normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text.lower())
    return "".join(c for c in text if not unicodedata.combining(c))


def _compile(terms):
    return re.compile(r"\b(?:" + "|".join(terms) + r")\b")


_MINOR_RE = _compile(_MINOR_TERMS)
_SEXUAL_RE = _compile(_SEXUAL_TERMS)


def check_prompt(prompt: str) -> str | None:
    """Retorna uma mensagem de bloqueio, ou None se o prompt pode ser gerado."""
    text = _normalize(prompt or "")
    if _MINOR_RE.search(text) and _SEXUAL_RE.search(text):
        return (
            "Bloqueado: o prompt combina menores de idade com conteúdo sexual. "
            "Essa é a única coisa que o MEIA não gera."
        )
    return None
