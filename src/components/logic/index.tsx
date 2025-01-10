"use client";

import React, { useState } from "react";
import { RefreshCcw, HardDriveDownload } from "lucide-react";

interface LinkedInData {
  ceo: string;
  headline?: string;
  location?: string;
  profileUrl?: string;
}

interface ProcessedItem {
  name: string;
  email: string;
  linkedInData?: LinkedInData;
}

const LogicComponent: React.FC = () => {
  const [rawData, setRawData] = useState<string>("");
  const [errors, setErrors] = useState<string[]>([]);
  const [processedData, setProcessedData] = useState<ProcessedItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentCompany, setCurrentCompany] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);

  const processData = (): void => {
    const lines = rawData.split("\n").filter((line) => line.trim());
    const newErrors: string[] = [];
    const newProcessedData: ProcessedItem[] = [];

    lines.forEach((line: string, index: number) => {
      const emailMatch = line.match(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
      );

      if (!emailMatch) {
        newErrors.push(`Line ${index + 1}: No valid email found - "${line}"`);
        return;
      }

      const email = emailMatch[0];
      const name = line.replace(email, "").trim();

      if (!name) {
        newErrors.push(`Line ${index + 1}: No name found - "${line}"`);
        return;
      }

      const cleanName = name.replace(/,/g, "").trim();

      newProcessedData.push({
        name: cleanName,
        email: email,
      });
    });

    setErrors(newErrors);
    setProcessedData(newProcessedData);
  };

  const extractCompanyName = (email: string): string => {
    const domain = email.split("@")[1].split(".")[0];
    return domain
      .replace(/corp$|inc$|llc$|ltd$|company$|co$/i, "")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .trim();
  };

  const fetchCEOData = async (company: string): Promise<LinkedInData> => {
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ company }),
      });

      const data = await response.json();
      return data.ceo === "Not found" ? { ceo: "Not found" } : data;
    } catch (error) {
      console.error("Error fetching CEO data:", error);
      return { ceo: "Not found" };
    }
  };

  const handleDownload = async () => {
    setIsLoading(true);
    setProgress(0);
    const enrichedData: ProcessedItem[] = [];
    const totalItems = processedData.length;

    try {
      for (let i = 0; i < processedData.length; i++) {
        const item = processedData[i];
        const companyName = extractCompanyName(item.email);
        setCurrentCompany(companyName);
        const linkedInData = await fetchCEOData(companyName);

        enrichedData.push({
          ...item,
          linkedInData,
        });

        // Update progress
        setProgress(Math.round(((i + 1) / totalItems) * 100));
      }

      setProcessedData(enrichedData);
    } catch (error) {
      console.error("Error processing CEO data:", error);
    } finally {
      setIsLoading(false);
      setCurrentCompany("");
      setProgress(0);
    }
  };

  const renderProcessedData = () => {
    if (!processedData[0].linkedInData) return null;

    return (
      <div className="space-y-4">
        {processedData.map((item, index) => (
          <div key={index} className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">{item.name}</h2>
              <p className="text-sm opacity-70">{item.email}</p>
              <div className="divider"></div>
              <div className="space-y-2">
                <p>
                  <span className="font-semibold">Company Leader:</span>{" "}
                  {item.linkedInData?.ceo}
                </p>
                {item.linkedInData?.headline && (
                  <p>
                    <span className="font-semibold">Title:</span>{" "}
                    {item.linkedInData.headline}
                  </p>
                )}
                {item.linkedInData?.location && (
                  <p>
                    <span className="font-semibold">Location:</span>{" "}
                    {item.linkedInData.location}
                  </p>
                )}
                {item.linkedInData?.profileUrl && (
                  <a
                    href={item.linkedInData.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link link-primary"
                  >
                    View LinkedIn Profile
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Raw Data
          <span className="text-error ml-1">*</span>
        </label>
        <textarea
          className="textarea textarea-bordered w-full h-72"
          placeholder="Enter names and emails (one per line)..."
          value={rawData}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setRawData(e.target.value)
          }
        />
      </div>

      <button onClick={processData} className="btn btn-primary w-full">
        Process Data <RefreshCcw className="w-4 h-4 ml-2" />
      </button>

      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((error, index) => (
            <div key={index} className="alert alert-error">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      {processedData.length > 0 && (
        <div className="mt-4">
          <h3 className="text-md font-semibold mb-2">Processed Data:</h3>
          <div className="bg-base-200 p-4 rounded-md">
            {processedData.length} valid contacts found
            {processedData[0].linkedInData && renderProcessedData()}
          </div>

          <button
            onClick={handleDownload}
            className={`btn btn-secondary w-full mt-5`}
            disabled={isLoading}
          >
            {!isLoading && (
              <>
                Get Company Data <HardDriveDownload className="w-4 h-4 ml-2" />
              </>
            )}
            {isLoading && (
              <div className="flex items-center gap-3">
                <span className="loading loading-spinner"></span>
                <span>Processing {currentCompany}...</span>
                <span className="text-xs">{progress}%</span>
              </div>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default LogicComponent;
