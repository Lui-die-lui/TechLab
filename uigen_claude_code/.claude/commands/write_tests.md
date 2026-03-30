$ARGUMENTS 대상에 대한 테스트 코드를 작성해줘.

요구사항:
1. Vitest와 React Testing Library를 사용
2. 테스트 파일은 원본 파일과 같은 폴더 아래 __tests__ 디렉토리에 생성
3. 파일명은 [filename].test.ts 또는 [filename].test.tsx 규칙 사용
4. import 경로는 @/ prefix 사용

반드시 포함할 테스트:
- 정상 동작 케이스
- edge case
- error state

작성 기준:
- 구현 세부사항보다 사용자 관점의 동작 검증 우선
- 필요한 경우만 최소한으로 mock 사용
- describe / it 구조로 가독성 있게 작성
- props 변화, 이벤트 핸들러 호출, 비동기 로직, 조건부 렌더링, 빈 데이터/undefined/null 같은 입력도 점검
- 테스트 대상이 hook이면 hook 특성에 맞게, 컴포넌트면 렌더링/상호작용 중심으로 작성