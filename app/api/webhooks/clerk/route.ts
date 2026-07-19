import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET || '';

export async function POST(req: Request) {
  const headerPayload = headers();
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { success: false, error: 'Missing required headers' },
      { status: 400 }
    );
  }

  const payload = await req.text();

  const wh = new Webhook(webhookSecret);
  let event;
  try {
    event = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as any;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return NextResponse.json(
      { success: false, error: 'Invalid webhook signature' },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    const eventType = event.type;

    if (eventType === 'user.created' || eventType === 'user.updated') {
      const { id, email_addresses, first_name, last_name, image_url } = event.data;
      const email = email_addresses[0]?.email_address;

      if (!email) {
        return NextResponse.json(
          { success: false, error: 'No email address found' },
          { status: 400 }
        );
      }

      await User.findOneAndUpdate(
        { clerkId: id },
        {
          $set: {
            email,
            firstName: first_name,
            lastName: last_name,
            imageUrl: image_url,
          },
        },
        { upsert: true, new: true }
      );

      return NextResponse.json({ success: true });
    }

    if (eventType === 'user.deleted') {
      const { id } = event.data;
      await User.findOneAndDelete({ clerkId: id });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true, message: 'Unhandled event type' });
  } catch (err) {
    console.error('Error processing webhook:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}