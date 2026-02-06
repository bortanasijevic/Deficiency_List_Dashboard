"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ExternalLink, Mail, ArrowUp, ArrowDown, Edit, ChevronDown } from "lucide-react";
import { TPunchListItemRow } from "@/lib/schemas";
import { formatDate } from "@/lib/dateFormatter";
import { fetchAllNotes, saveNote, cleanupNotes } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { NotesModal } from "@/components/NotesModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SortField = "number" | "due_date" | "days_late" | "days_in_court";
type SortDirection = "asc" | "desc";

interface PunchListTableProps {
  rows: TPunchListItemRow[];
}

export function PunchListTable({ rows }: PunchListTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("number");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  // Load all notes on mount
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const allNotes = await fetchAllNotes();
        setNotes(allNotes);
      } catch (error) {
        console.error("Failed to load notes:", error);
      }
    };
    loadNotes();
  }, []);

  // Cleanup orphaned notes when rows change
  useEffect(() => {
    const cleanup = async () => {
      try {
        const currentItemIds = rows.map((row) => row.id);
        await cleanupNotes(currentItemIds);
      } catch (error) {
        console.error("Failed to cleanup notes:", error);
      }
    };
    
    if (rows.length > 0) {
      cleanup();
    }
  }, [rows]);

  const handleOpenModal = useCallback((itemId: string) => {
    setEditingItemId(itemId);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setEditingItemId(null);
  }, []);

  const handleSaveNote = useCallback(async (text: string) => {
    if (!editingItemId) return;
    
    try {
      await saveNote(editingItemId, text);
      setNotes((prev) => ({ ...prev, [editingItemId]: text }));
    } catch (error) {
      console.error("Failed to save note:", error);
      throw error; // Let the modal handle the error
    }
  }, [editingItemId]);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "number" ? "desc" : "asc");
    }
  }, [sortField]);

  // Get unique company names
  const uniqueCompanyNames = useMemo(() => {
    const companies = new Set<string>();
    rows.forEach((row) => {
      if (row.company_name && row.company_name.trim()) {
        companies.add(row.company_name.trim());
      }
    });
    return Array.from(companies).sort();
  }, [rows]);

  // Get unique status values
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set<string>();
    rows.forEach((row) => {
      if (row.status && row.status.trim()) {
        statuses.add(row.status.trim());
      }
    });
    return Array.from(statuses).sort();
  }, [rows]);

  const filteredAndSortedRows = useMemo(() => {
    let filtered = rows;

    // Filter by company name
    if (selectedCompany) {
      filtered = filtered.filter(
        (row) => row.company_name && row.company_name.trim() === selectedCompany
      );
    }

    // Filter by status
    if (selectedStatus) {
      filtered = filtered.filter(
        (row) => row.status && row.status.trim() === selectedStatus
      );
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (row) =>
          row.number.toLowerCase().includes(term) ||
          row.subject.toLowerCase().includes(term) ||
          row.assigned_to.toLowerCase().includes(term) ||
          (row.company_name && row.company_name.toLowerCase().includes(term)) ||
          row.status.toLowerCase().includes(term)
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case "number":
          aVal = Number(a.number);
          bVal = Number(b.number);
          break;
        case "due_date":
          aVal = a.due_date ? new Date(a.due_date).getTime() : 0;
          bVal = b.due_date ? new Date(b.due_date).getTime() : 0;
          break;
        case "days_late":
          aVal = a.days_late;
          bVal = b.days_late;
          break;
        case "days_in_court":
          aVal = a.days_in_court;
          bVal = b.days_in_court;
          break;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [rows, searchTerm, sortField, sortDirection, selectedCompany, selectedStatus]);

  const getDaysLateColor = (days: number) => {
    if (days === 0) return "bg-gray-100 text-gray-700";
    if (days >= 1 && days <= 3) return "bg-yellow-100 text-yellow-800";
    if (days >= 4 && days <= 7) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-900";
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === "closed") return "bg-gray-100 text-gray-700";
    if (s === "open") return "bg-blue-100 text-blue-800";
    if (s === "overdue") return "bg-red-100 text-red-900";
    return "bg-gray-100 text-gray-700";
  };

  const SortableHeader = ({
    field,
    children,
    className,
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) => (
    <TableHead
      className={`cursor-pointer select-none hover:bg-muted/50 ${className || ''}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center justify-center gap-1">
        {children}
        {sortField === field && (
          sortDirection === "asc" ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )
        )}
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      {/* Search Box */}
      <div className="flex items-center gap-4">
        <Input
          type="text"
          placeholder="Search by number, subject, assigned to, company, or status..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
        <div className="text-sm text-muted-foreground">
          Showing {filteredAndSortedRows.length} of {rows.length} items
        </div>
      </div>

      {/* Table - Single table with sticky header */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-350px)]">
          <Table className="w-full min-w-full table-full-width responsive-table">
            <TableHeader className="sticky top-0 z-10 bg-white shadow-sm">
              <TableRow>
                <SortableHeader field="number" className="max-w-[80px] w-[80px]">Number</SortableHeader>
                <TableHead className="max-w-[350px] w-[350px] text-center">Subject</TableHead>
                <TableHead className="max-w-[100px] w-[100px] text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-auto p-0 font-semibold hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-1 flex-wrap justify-center">
                          <span>Status</span>
                          {selectedStatus && (
                            <Badge variant="secondary" className="text-xs max-w-[100px] truncate">
                              {selectedStatus}
                            </Badge>
                          )}
                          <ChevronDown className="h-4 w-4 flex-shrink-0" />
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto">
                      <DropdownMenuItem
                        onClick={() => setSelectedStatus(null)}
                        className={selectedStatus === null ? "bg-accent" : ""}
                      >
                        All Statuses
                      </DropdownMenuItem>
                      {uniqueStatuses.length > 0 && (
                        <>
                          {uniqueStatuses.map((status) => (
                            <DropdownMenuItem
                              key={status}
                              onClick={() => setSelectedStatus(status)}
                              className={selectedStatus === status ? "bg-accent" : ""}
                            >
                              {status}
                            </DropdownMenuItem>
                          ))}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableHead>
                <TableHead className="max-w-[250px] w-[250px] text-center">Assigned To</TableHead>
                <TableHead className="max-w-[200px] w-[200px] text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-auto p-0 font-semibold hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-1 flex-wrap justify-center">
                          <span>Company Name</span>
                          {selectedCompany && (
                            <Badge variant="secondary" className="text-xs max-w-[120px] truncate">
                              {selectedCompany}
                            </Badge>
                          )}
                          <ChevronDown className="h-4 w-4 flex-shrink-0" />
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto">
                      <DropdownMenuItem
                        onClick={() => setSelectedCompany(null)}
                        className={selectedCompany === null ? "bg-accent" : ""}
                      >
                        All Companies
                      </DropdownMenuItem>
                      {uniqueCompanyNames.length > 0 && (
                        <>
                          {uniqueCompanyNames.map((company) => (
                            <DropdownMenuItem
                              key={company}
                              onClick={() => setSelectedCompany(company)}
                              className={selectedCompany === company ? "bg-accent" : ""}
                            >
                              {company}
                            </DropdownMenuItem>
                          ))}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableHead>
                <SortableHeader field="due_date" className="min-w-[120px] w-[140px]">Due Date</SortableHeader>
                <SortableHeader field="days_late" className="min-w-[100px] w-[120px]">Days Late</SortableHeader>
                <SortableHeader field="days_in_court" className="min-w-[100px] w-[120px]">Days in Court</SortableHeader>
                <TableHead className="min-w-[250px] w-[300px] text-center">Notes</TableHead>
                <TableHead className="min-w-[80px] w-[100px] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium max-w-[80px] w-[80px]">{row.number}</TableCell>
                  <TableCell className="max-w-[350px] w-[350px]">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="truncate">{row.subject}</div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-sm">{row.subject}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="max-w-[100px] w-[100px]">
                    <Badge className={`${getStatusColor(row.status)} px-3 py-1`}>
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[250px] w-[250px]">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col gap-1">
                          {row.assigned_to ? (
                            row.assigned_to.split(/[;,\n]/).map((person, idx) => (
                              <div key={idx} className="truncate whitespace-nowrap text-sm">
                                {person.trim()}
                              </div>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">Unassigned</span>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="max-w-sm space-y-1">
                          {row.assigned_to ? (
                            row.assigned_to.split(/[;,\n]/).map((person, idx) => (
                              <div key={idx}>{person.trim()}</div>
                            ))
                          ) : (
                            <div>Unassigned</div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="max-w-[200px] w-[200px]">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="truncate text-sm">
                          {row.company_name || <span className="text-muted-foreground">N/A</span>}
                        </div>
                      </TooltipTrigger>
                      {row.company_name && (
                        <TooltipContent>
                          <p className="max-w-sm">{row.company_name}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TableCell>
                  <TableCell className="min-w-[120px] w-[140px]">
                    {row.due_date ? formatDate(row.due_date) : "N/A"}
                  </TableCell>
                  <TableCell className="min-w-[100px] w-[120px]">
                    <Badge className={`${getDaysLateColor(row.days_late)} px-3 py-1`}>
                      {row.days_late}
                    </Badge>
                  </TableCell>
                  <TableCell className="min-w-[100px] w-[120px]">
                    <Badge className="bg-gray-100 text-gray-700 px-3 py-1">
                      {row.days_in_court}
                    </Badge>
                  </TableCell>
                  <TableCell className="min-w-[250px] w-[300px]">
                    <Button
                      variant="outline"
                      className="w-full justify-start h-auto min-h-[60px] p-2 text-left font-normal"
                      onClick={() => handleOpenModal(row.id)}
                    >
                      <div className="flex items-start gap-2 w-full">
                        <Edit className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 truncate text-sm">
                          {notes[row.id] ? (
                            <span className="line-clamp-2 whitespace-pre-wrap text-black">
                              {notes[row.id]}
                            </span>
                          ) : (
                            <span className="italic text-muted-foreground">Click to add note...</span>
                          )}
                        </div>
                      </div>
                    </Button>
                  </TableCell>
                  <TableCell className="min-w-[80px] w-[100px]">
                    <div className="flex gap-2 justify-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(row.link, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Open item link</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const mailto = row.mailto_reminder || "";
                              if (mailto) {
                                window.open(mailto, "_blank");
                              }
                            }}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Send reminder email</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Notes Modal */}
      {editingItemId && (
        <NotesModal
          isOpen={modalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveNote}
          initialText={notes[editingItemId] || ""}
          itemNumber={rows.find((r) => r.id === editingItemId)?.number || ""}
          itemSubject={rows.find((r) => r.id === editingItemId)?.subject || ""}
        />
      )}
    </div>
  );
}

