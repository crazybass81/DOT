export default function DirectPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f0f9ff'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '10px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <h1 style={{ color: '#059669', fontSize: '2rem', margin: '0 0 20px 0' }}>
          ✅ 성공!
        </h1>
        <p style={{ margin: '10px 0', fontSize: '1.1rem' }}>
          이 페이지가 보인다면 Next.js가 정상 작동합니다.
        </p>
        <p style={{ margin: '10px 0', color: '#666' }}>
          현재 시간: {new Date().toLocaleString('ko-KR')}
        </p>
        <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '5px' }}>
          <strong>다음 단계:</strong>
          <br />
          원본 홈페이지의 JavaScript 에러를 수정해야 합니다.
        </div>
      </div>
    </div>
  );
}