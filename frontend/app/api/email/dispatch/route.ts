import { NextResponse } from 'next/server';
import { PostcardEmail } from '../../../../lib/types';

export async function POST(request: Request) {
  const body: PostcardEmail = await request.json();
  console.log(`💌 Dispatching ${body.type} postcard email to ${body.recipient}`);
  
  return NextResponse.json({
    success: true,
    message: `Bưu thiếp ${body.type === 'sunrise' ? 'Bình Minh' : 'Tổng Kết'} đã gửi thành công tới ${body.recipient}!`,
    timestamp: new Date().toISOString(),
  });
}
