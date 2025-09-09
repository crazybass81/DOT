export default function TestPage() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: 'green' }}>테스트 페이지 로드 성공!</h1>
      <p>서버가 정상적으로 작동 중입니다.</p>
      <p>현재 시간: {new Date().toLocaleString('ko-KR')}</p>
    </div>
  );
}