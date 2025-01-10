import { NextResponse } from "next/server";

interface LinkedInResponse {
  success: boolean;
  message: string;
  data: {
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
      "x-rapidapi-key": "953c5247bfmsh834e1258f271226p132277jsn7d296c0cfc3e",
      "x-rapidapi-host": "linkedin-api8.p.rapidapi.com",
    },
  };

  try {
    const response = await fetch(url, options);
    const data = (await response.json()) as LinkedInResponse;

    console.log(data.data);

    if (data.success && data.data.items.length > 0) {
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
