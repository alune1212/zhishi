import subprocess
import sys
from pathlib import Path

import pytest

CHECKER = Path(__file__).resolve().parents[3] / "scripts/check-doc-links.py"


def run_checker(root: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(  # noqa: S603 - repository CLI, controlled test paths
        [sys.executable, str(CHECKER), "--root", str(root)],
        check=False,
        capture_output=True,
        text=True,
    )


def test_documentation_checker_accepts_local_assets_and_anchors(tmp_path: Path) -> None:
    docs = tmp_path / "docs"
    docs.mkdir()
    (docs / "题目.xlsx").write_bytes(b"synthetic asset")
    (docs / "guide.md").write_text("# 使用说明\n## 登录\n## 登录\n", encoding="utf-8")
    (tmp_path / "README.md").write_text(
        "[说明](docs/guide.md#登录-1)\n"
        "[样例](docs/%E9%A2%98%E7%9B%AE.xlsx)\n"
        '<img src="docs/题目.xlsx">\n'
        "```markdown\n[示例语法](does-not-exist.md)\n```\n"
        "[外部](https://example.com/unfetched)\n",
        encoding="utf-8",
    )

    result = run_checker(tmp_path)

    assert result.returncode == 0, result.stdout + result.stderr
    assert "3 local links" in result.stdout


@pytest.mark.parametrize(
    ("link", "expected_error"),
    [
        ("missing.md", "Missing local target"),
        ("README.md#missing", "Missing Markdown anchor"),
    ],
)
def test_documentation_checker_rejects_broken_links(
    tmp_path: Path, link: str, expected_error: str
) -> None:
    (tmp_path / "README.md").write_text(f"# Guide\n[broken]({link})\n")

    result = run_checker(tmp_path)

    assert result.returncode == 1
    assert expected_error in result.stdout
    assert link in result.stdout
