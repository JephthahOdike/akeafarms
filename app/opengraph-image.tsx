import { ImageResponse } from 'next/og';

export const alt = 'Akea Farms – Agricultural Marketplace';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #044300 0%, #2f7a13 100%)',
          color: '#ffffff',
          padding: 80
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 140,
            height: 140,
            borderRadius: 70,
            background: '#ffffff',
            marginBottom: 40
          }}
        >
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: '50%',
              background: '#53d200',
              display: 'flex'
            }}
          />
        </div>
        <div
          style={{
            fontSize: 120,
            fontWeight: 700,
            letterSpacing: -2,
            display: 'flex'
          }}
        >
          Akea Farms
        </div>
        <div
          style={{
            fontSize: 42,
            color: '#d9f2c8',
            marginTop: 24,
            display: 'flex',
            textAlign: 'center'
          }}
        >
          Fresh farm products from verified Nigerian farmers
        </div>
      </div>
    ),
    { ...size }
  );
}
