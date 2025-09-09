export default function StaticPage() {
  return (
    <html>
      <head>
        <title>정적 테스트 페이지</title>
      </head>
      <body>
        <h1 style={{ color: 'green', textAlign: 'center', marginTop: '50px' }}>
          🎉 페이지 로드 성공!
        </h1>
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <p>이 페이지가 보인다면 Next.js가 정상 작동 중입니다.</p>
          <p>현재 시간: {new Date().toLocaleString('ko-KR')}</p>
        </div>
      </body>
    </html>
  );
}