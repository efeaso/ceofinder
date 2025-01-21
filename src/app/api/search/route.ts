import { NextResponse } from "next/server";

interface LinkedInResponse {
  success: boolean;
  message: string;
  data?: {
    total: number;
    items: {
      fullName: string;
      headline: string;
      summary: string;
      profilePicture: string;
      location: string;
      profileURL: string;
      username: string;
    }[];
  };
}

export async function POST(req: Request) {
  const body = await req.json();
  const { company } = body;

  console.log("Company:", company);

  const searchQuery = encodeURIComponent(`${company}`);

  const url = `https://linkedin-api8.p.rapidapi.com/search-people?keywords=${searchQuery}&start=0`;

  const options = {
    method: "GET",
    headers: {
      "x-rapidapi-key": "909b22e2bdmsh5f40f4996bd66f9p143fd1jsn3d426375925f",
      "x-rapidapi-host": "linkedin-api8.p.rapidapi.com",
    },
  };

  try {
    const response = await fetch(url, options);
    const data = (await response.json()) as LinkedInResponse;

    console.log(data);

    // Check if data and data.data exist before accessing items
    if (data?.success && data?.data?.items && data.data.items.length > 0) {
      // If we found multiple people, return them all
      if (data.data.items.length > 1) {
        return NextResponse.json({
          multiple: true,
          items: data.data.items.map((item) => ({
            fullName: item.fullName,
            headline: item.headline,
            location: item.location,
            profileURL: item.profileURL,
            profilePicture: item.profilePicture,
          })),
        });
      }

      // If we only found one person, return in the original format
      return NextResponse.json({
        ceo: data.data.items[0].fullName,
        headline: data.data.items[0].headline,
        location: data.data.items[0].location,
        profileUrl: data.data.items[0].profileURL,
      });
    }

    return NextResponse.json({
      ceo: "Not found",
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch CEO data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}
