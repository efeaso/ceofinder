"use client";
import React, { useState } from "react";
import { RefreshCcw, HardDriveDownload, X } from "lucide-react";

interface LinkedInPerson {
  fullName: string;
  headline: string;
  location: string;
  profileURL: string;
  profilePicture: string;
}

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

interface SelectPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: LinkedInPerson[];
  onSelect: (person: LinkedInPerson) => void;
  companyName: string;
}

const SelectPersonModal: React.FC<SelectPersonModalProps> = ({
  isOpen,
  onClose,
  people,
  onSelect,
  companyName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Select Person from {companyName}
          </h2>
          <button onClick={onClose} className="p-2">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="space-y-4">
          {people.map((person, index) => (
            <div
              key={index}
              className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => {
                onSelect(person);
                onClose();
              }}
            >
              <div className="flex items-center gap-4">
                {person.profilePicture && (
                  <img
                    src={person.profilePicture}
                    alt={person.fullName}
                    className="w-12 h-12 rounded-full"
                  />
                )}
                <div>
                  <h3 className="font-semibold">{person.fullName}</h3>
                  <p className="text-sm text-gray-600">{person.headline}</p>
                  <p className="text-sm text-gray-500">{person.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const LogicComponent: React.FC = () => {
  const [rawData, setRawData] = useState<string>("");
  const [errors, setErrors] = useState<string[]>([]);
  const [processedData, setProcessedData] = useState<ProcessedItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentCompany, setCurrentCompany] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentPeople, setCurrentPeople] = useState<LinkedInPerson[]>([]);
  const [processingQueue, setProcessingQueue] = useState<{
    index: number;
    remaining: ProcessedItem[];
  } | null>(null);

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

  const fetchCEOData = async (
    company: string
  ): Promise<{
    data: LinkedInPerson[];
    single?: LinkedInData;
  }> => {
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ company }),
      });

      const data = await response.json();

      if (data.multiple && Array.isArray(data.items)) {
        return { data: data.items };
      } else if (data.ceo && data.ceo !== "Not found") {
        return {
          data: [],
          single: {
            ceo: data.ceo,
            headline: data.headline,
            location: data.location,
            profileUrl: data.profileUrl,
          },
        };
      }

      return { data: [] };
    } catch (error) {
      console.error("Error fetching CEO data:", error);
      return { data: [] };
    }
  };

  const handlePersonSelection = async (person: LinkedInPerson) => {
    if (!processingQueue) return;

    const { index, remaining } = processingQueue;
    const linkedInData = {
      ceo: person.fullName,
      headline: person.headline,
      location: person.location,
      profileUrl: person.profileURL,
    };

    const updatedProcessedData = [...processedData];
    updatedProcessedData[index] = {
      ...updatedProcessedData[index],
      linkedInData,
    };
    setProcessedData(updatedProcessedData);

    // Continue processing remaining items
    await processRemainingItems(remaining);
  };

  const processRemainingItems = async (remainingItems: ProcessedItem[]) => {
    if (!remainingItems.length) {
      setIsLoading(false);
      setCurrentCompany("");
      setProgress(0);
      return;
    }

    const totalItems = processedData.length;
    const processedCount = totalItems - remainingItems.length;

    for (let i = 0; i < remainingItems.length; i++) {
      const item = remainingItems[i];
      const currentIndex = processedCount + i;
      const companyName = extractCompanyName(item.email);
      setCurrentCompany(companyName);

      try {
        const result = await fetchCEOData(companyName);

        // Safe check for data array
        if (Array.isArray(result.data) && result.data.length > 1) {
          // Multiple people found, show modal
          setCurrentPeople(result.data);
          setModalOpen(true);
          setProcessingQueue({
            index: currentIndex,
            remaining: remainingItems.slice(i + 1),
          });
          break;
        } else if (result.single) {
          // Single person found, use automatically
          const updatedProcessedData = [...processedData];
          updatedProcessedData[currentIndex] = {
            ...item,
            linkedInData: result.single,
          };
          setProcessedData(updatedProcessedData);
        }

        setProgress(Math.round(((currentIndex + 1) / totalItems) * 100));
      } catch (error) {
        console.error(`Error processing company ${companyName}:`, error);
        continue; // Skip this item and continue with the next
      }
    }

    if (!remainingItems.length) {
      setIsLoading(false);
      setCurrentCompany("");
      setProgress(0);
    }
  };

  const handleDownload = async () => {
    setIsLoading(true);
    setProgress(0);
    await processRemainingItems([...processedData]);
  };

  const renderProcessedData = () => {
    return (
      <div className="space-y-4">
        {processedData.map((item, index) => (
          <div key={index} className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">{item.name}</h2>
              <p className="text-sm opacity-70">{item.email}</p>

              {item.linkedInData && (
                <>
                  <div className="divider"></div>
                  <div className="space-y-2">
                    <p>
                      <span className="font-semibold">Company Leader:</span>{" "}
                      {item.linkedInData.ceo}
                    </p>
                    {item.linkedInData.headline && (
                      <p>
                        <span className="font-semibold">Title:</span>{" "}
                        {item.linkedInData.headline}
                      </p>
                    )}
                    {item.linkedInData.location && (
                      <p>
                        <span className="font-semibold">Location:</span>{" "}
                        {item.linkedInData.location}
                      </p>
                    )}
                    {item.linkedInData.profileUrl && (
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
                </>
              )}
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
            <div className="space-y-4 mt-4">
              {processedData.map((item, index) => (
                <div key={index} className="card bg-base-100 shadow-xl">
                  <div className="card-body">
                    <h2 className="card-title">{item.name}</h2>
                    <p className="text-sm opacity-70">{item.email}</p>

                    {item.linkedInData && (
                      <>
                        <div className="divider"></div>
                        <div className="space-y-2">
                          <p>
                            <span className="font-semibold">
                              Company Leader:
                            </span>{" "}
                            {item.linkedInData.ceo}
                          </p>
                          {item.linkedInData.headline && (
                            <p>
                              <span className="font-semibold">Title:</span>{" "}
                              {item.linkedInData.headline}
                            </p>
                          )}
                          {item.linkedInData.location && (
                            <p>
                              <span className="font-semibold">Location:</span>{" "}
                              {item.linkedInData.location}
                            </p>
                          )}
                          {item.linkedInData.profileUrl && (
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
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleDownload}
            className="btn btn-secondary w-full mt-5"
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

      <SelectPersonModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        people={currentPeople}
        onSelect={handlePersonSelection}
        companyName={currentCompany}
      />
    </div>
  );
};

export default LogicComponent;
