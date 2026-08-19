# GitHub 협업 사용자 가이드

## 학습 목표

- GitHub 협업에 필요한 저장소, 브랜치, 커밋, Pull Request의 역할을 이해한다.
- 저장소를 복제한 뒤 개인 브랜치에서 작업하고 원격 저장소에 공유할 수 있다.
- Pull Request를 만들고 리뷰 의견을 반영한 뒤 안전하게 병합할 수 있다.
- 충돌과 실수에 대응하는 기본 방법을 익힌다.

## 먼저 보는 협업 흐름

```text
저장소 복제 → 작업 브랜치 생성 → 파일 수정 → 커밋 → 푸시
                                               ↓
                         병합 ← 리뷰 반영 ← Pull Request 생성
```

팀 저장소의 기본 브랜치(`main`)에는 직접 작업하지 않습니다. 기능이나 문서 단위로 브랜치를 만들고, Pull Request와 리뷰를 거쳐 병합합니다.

## 1. 최초 환경 설정

Git과 GitHub CLI가 설치되어 있는지 확인합니다.

```powershell
git --version
gh --version
```

커밋에 기록할 사용자 정보를 설정합니다.

```powershell
git config --global user.name "홍길동"
git config --global user.email "your-email@example.com"
```

GitHub CLI를 사용한다면 로그인합니다.

```powershell
gh auth login
gh auth status
```

> 조직에서 회사 계정, SSH 키, 2단계 인증 등의 규칙을 정했다면 해당 규칙을 우선합니다.

## 2. 팀원 추가하기

팀원 초대는 저장소 소유자 또는 접근 권한을 관리할 수 있는 담당자가 진행합니다. 초대하기 전에 팀원의 **GitHub 사용자 이름**과 저장소에 필요한 역할을 확인합니다.

### 개인 계정 저장소에 팀원 초대

1. GitHub에서 함께 사용할 저장소를 엽니다.
2. 저장소 상단의 **Settings**를 선택합니다. 메뉴가 보이지 않으면 드롭다운 메뉴에서 찾습니다.
3. 왼쪽 **Access** 영역에서 **Collaborators**를 선택합니다.
4. **Add people**을 누릅니다.
5. 팀원의 GitHub 사용자 이름 또는 이메일 주소를 검색해 선택합니다.
6. **Add 이름 to 저장소명**을 눌러 초대를 보냅니다.
7. 팀원이 이메일이나 GitHub 알림에서 초대를 수락했는지 확인합니다.

개인 계정 소유 저장소는 소유자와 collaborator로 권한 구조가 단순합니다. 읽기·이슈 관리·코드 작성 등을 역할별로 세밀하게 구분해야 한다면 조직(Organization) 저장소 사용을 권장합니다.

### 조직 저장소에 팀원 또는 팀 추가

조직 저장소에서는 개인별로 추가할 수도 있지만, 여러 저장소를 함께 운영한다면 팀(Team)을 만들고 팀 단위로 권한을 부여하는 편이 관리하기 쉽습니다.

1. 조직 저장소의 **Settings**를 엽니다.
2. **Collaborators and teams** 또는 접근 관리 메뉴를 선택합니다.
3. **Add people** 또는 **Add teams**를 선택합니다.
4. 사용자나 팀을 검색하고 필요한 저장소 역할을 선택합니다.
5. 초대를 보낸 뒤 수락 여부와 실제 접근 권한을 확인합니다.

조직 밖의 사용자를 추가하면 outside collaborator로 관리될 수 있습니다. 조직의 2단계 인증, SSO, 외부 협업자 제한 정책이 적용되는지도 확인합니다.

| 역할 | 권장 대상 |
| --- | --- |
| Read | 코드와 문서를 열람하거나 토론에 참여하는 사람 |
| Triage | 코드 수정 없이 이슈와 Pull Request를 관리하는 사람 |
| Write | 브랜치에 코드를 푸시하는 일반 개발 팀원 |
| Maintain | 저장소 설정 일부와 운영을 담당하는 리드 |
| Admin | 접근 권한과 주요 설정까지 관리하는 저장소 관리자 |

필요한 최소 권한만 부여합니다. 일반 개발자는 보통 `Write`, 검토만 하는 참여자는 `Read` 또는 `Triage`로 시작하고, `Admin`은 소수의 관리자에게만 부여합니다.

### 팀원이 확인할 사항

- GitHub 알림 또는 초대 이메일에서 **Accept invitation**을 선택합니다.
- 저장소 페이지가 열리고 코드를 볼 수 있는지 확인합니다.
- 아래 명령으로 저장소를 복제할 수 있는지 확인합니다.
- 푸시 권한이 필요한 팀원은 개인 작업 브랜치를 만들어 테스트합니다.

초대가 보이지 않으면 GitHub 사용자 이름과 이메일 주소가 정확한지, 초대가 만료되거나 취소되지 않았는지, 조직의 2단계 인증 또는 SSO 조건을 충족했는지 확인합니다.

### 권한 변경 및 팀원 제거

담당 업무가 바뀌면 저장소의 접근 관리 화면에서 역할을 조정합니다. 프로젝트에서 빠진 팀원은 접근 권한을 제거하고, 개인 액세스 토큰·배포 키·공유 비밀 정보 등 별도로 발급한 자격 증명도 함께 점검합니다. 제거 전에 해당 팀원이 담당한 이슈와 Pull Request를 다른 사람에게 인계합니다.

참고: [개인 저장소에 collaborator 초대](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/inviting-collaborators-to-a-personal-repository), [조직 저장소 역할](https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization)

## 3. 저장소 내려받기

팀에서 전달받은 저장소 주소를 복제합니다.

```powershell
git clone https://github.com/ORGANIZATION/REPOSITORY.git
cd REPOSITORY
```

현재 원격 저장소와 브랜치를 확인합니다.

```powershell
git remote -v
git branch --show-current
git status
```

## 4. 작업 시작하기

작업 전 기본 브랜치를 최신 상태로 맞춥니다.

```powershell
git switch main
git pull --ff-only origin main
```

작업 목적이 드러나는 새 브랜치를 만듭니다.

```powershell
git switch -c docs/add-user-guide
```

권장 브랜치 이름 예시는 다음과 같습니다.

| 작업 종류 | 예시 |
| --- | --- |
| 기능 추가 | `feature/add-login` |
| 버그 수정 | `fix/login-error` |
| 문서 수정 | `docs/update-readme` |
| 구조 개선 | `refactor/api-client` |

브랜치는 하나의 작업만 담도록 작게 유지합니다.

## 5. 변경 확인하고 커밋하기

파일을 수정한 뒤 변경 범위를 확인합니다.

```powershell
git status
git diff
```

커밋할 파일만 선택해 스테이징합니다.

```powershell
git add README.md
git diff --staged
```

변경 목적이 드러나는 메시지로 커밋합니다.

```powershell
git commit -m "docs: GitHub 협업 사용자 가이드 추가"
```

좋은 커밋은 작고 독립적이며, 제목만 읽어도 변경 이유를 알 수 있습니다. `.env`, API 키, 비밀번호, 개인정보는 커밋하지 않습니다.

## 6. GitHub에 브랜치 공유하기

처음 푸시할 때 원격 추적 브랜치를 연결합니다.

```powershell
git push -u origin docs/add-user-guide
```

이후 같은 브랜치에서는 다음 명령만 사용해도 됩니다.

```powershell
git push
```

## 7. Pull Request 만들기

GitHub 웹 화면에서 `Compare & pull request`를 선택하거나 GitHub CLI를 사용합니다.

```powershell
gh pr create --base main --fill
```

Pull Request에는 다음 내용을 적습니다.

- 무엇을 변경했는지
- 왜 변경했는지
- 어떻게 확인했는지
- 리뷰어가 특별히 확인할 부분
- 관련 이슈 번호(예: `Closes #12`)

아직 작업 중이라면 Draft Pull Request로 만들고, 검토할 준비가 끝난 뒤 Ready for review로 전환합니다.

## 8. 리뷰 의견 반영하기

리뷰 내용을 확인한 뒤 같은 브랜치에서 수정하고 커밋합니다.

```powershell
git add <수정한-파일>
git commit -m "docs: 리뷰 의견 반영"
git push
```

추가 커밋은 기존 Pull Request에 자동으로 반영됩니다. 의견을 반영했거나 반영하지 않은 이유를 댓글로 명확하게 남깁니다.

## 9. 최신 main 반영하기

리뷰 중 `main`이 변경되었다면 작업 브랜치에 최신 내용을 반영합니다.

```powershell
git fetch origin
git merge origin/main
```

충돌이 없으면 테스트 후 푸시합니다.

```powershell
git push
```

팀에서 rebase 방식을 사용한다면 팀 규칙에 따라 `git rebase origin/main`을 사용합니다. 이미 공유한 브랜치의 이력을 강제로 바꾸기 전에는 반드시 팀원과 합의합니다.

## 10. 충돌 해결하기

충돌이 발생하면 `git status`로 대상 파일을 확인합니다. 파일 안의 충돌 표시는 다음과 같습니다.

```text
<<<<<<< HEAD
내 브랜치의 내용
=======
main 브랜치의 내용
>>>>>>> origin/main
```

필요한 내용만 남기고 충돌 표시를 모두 삭제한 뒤 파일을 저장합니다.

```powershell
git add <충돌을-해결한-파일>
git commit
git push
```

어떤 내용을 선택해야 할지 확실하지 않다면 임의로 삭제하지 말고 해당 코드를 작성한 팀원과 확인합니다.

## 11. 병합 후 정리하기

Pull Request가 병합되면 로컬 기본 브랜치를 갱신하고 완료된 브랜치를 삭제합니다.

```powershell
git switch main
git pull --ff-only origin main
git branch -d docs/add-user-guide
```

GitHub에서 원격 브랜치가 자동 삭제되지 않았다면 다음과 같이 정리할 수 있습니다.

```powershell
git push origin --delete docs/add-user-guide
```

## 자주 쓰는 확인 명령

```powershell
git status                 # 현재 변경 및 브랜치 상태
git diff                   # 아직 스테이징하지 않은 변경
git diff --staged          # 커밋할 변경
git log --oneline --graph --decorate -10
git branch -a              # 로컬·원격 브랜치 목록
git remote -v              # 연결된 원격 저장소
```

## 실수했을 때

### 아직 커밋하지 않은 파일을 스테이징에서 제외

```powershell
git restore --staged <파일>
```

### 마지막 커밋 메시지 수정

아직 푸시하지 않은 커밋에만 사용하는 것이 안전합니다.

```powershell
git commit --amend
```

### 이미 공유한 커밋 취소

공유 브랜치의 기록을 삭제하지 않고 반대 변경을 새 커밋으로 만듭니다.

```powershell
git revert <커밋-해시>
git push
```

`git reset --hard`, 강제 푸시(`git push --force`)는 다른 사람의 작업을 잃게 할 수 있으므로 팀의 확인 없이 사용하지 않습니다.

## 협업 체크리스트

### 작업 시작 전

- [ ] 이슈 또는 작업 요청의 완료 조건을 확인했다.
- [ ] `main`을 최신 상태로 갱신했다.
- [ ] 작업 전용 브랜치를 만들었다.

### Pull Request 전

- [ ] 의도하지 않은 파일과 비밀 정보가 포함되지 않았다.
- [ ] 변경 내용을 직접 실행하거나 테스트했다.
- [ ] `git diff --staged`와 커밋 기록을 확인했다.
- [ ] Pull Request 설명에 변경 이유와 확인 방법을 작성했다.

### 병합 후

- [ ] `main`을 다시 갱신했다.
- [ ] 완료된 로컬·원격 브랜치를 정리했다.
- [ ] 관련 이슈와 문서의 상태를 갱신했다.

## 권장 팀 규칙

- `main` 브랜치 보호와 필수 리뷰를 설정합니다.
- Pull Request는 작게 나누고 한 가지 목적만 담습니다.
- 자동 테스트와 린트가 통과한 뒤 병합합니다.
- 병합 방식(Squash, Merge, Rebase)을 팀에서 하나로 정합니다.
- 긴급 수정도 가능한 한 Pull Request 기록을 남깁니다.
