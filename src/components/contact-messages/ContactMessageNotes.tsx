"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Plus, Check, X, MessageSquare } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getContactMessageNotes,
  addContactMessageNote,
  updateContactMessageNote,
  deleteContactMessageNote,
  type ContactMessageNote,
} from "@/app/actions/contact-message-notes";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ContactMessageNotesProps {
  messageId: string;
}

export function ContactMessageNotes({ messageId }: ContactMessageNotesProps) {
  const [notes, setNotes] = useState<ContactMessageNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  const loadNotes = async () => {
    setLoading(true);
    const result = await getContactMessageNotes(messageId);
    if (result.success && Array.isArray(result.data)) {
      setNotes(result.data);
    } else {
      toast.error(result.error || "Error al cargar notas");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (messageId) {
      loadNotes();
    }
  }, [messageId]);

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) {
      toast.error("Escribe algo antes de guardar");
      return;
    }

    setSaving(true);
    const result = await addContactMessageNote(messageId, newNoteContent);

    if (result.success) {
      toast.success("Nota añadida");
      setNewNoteContent("");
      loadNotes();
    } else {
      toast.error(result.error || "Error al añadir nota");
    }

    setSaving(false);
  };

  const handleStartEdit = (note: ContactMessageNote) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditingContent("");
  };

  const handleSaveEdit = async (noteId: string) => {
    if (!editingContent.trim()) {
      toast.error("El contenido no puede estar vacío");
      return;
    }

    setSaving(true);
    const result = await updateContactMessageNote(noteId, editingContent);

    if (result.success) {
      toast.success("Nota actualizada");
      setEditingNoteId(null);
      setEditingContent("");
      loadNotes();
    } else {
      toast.error(result.error || "Error al actualizar nota");
    }

    setSaving(false);
  };

  const handleDeleteConfirm = (noteId: string) => {
    setNoteToDelete(noteId);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!noteToDelete) return;

    setSaving(true);
    const result = await deleteContactMessageNote(noteToDelete);

    if (result.success) {
      toast.success("Nota eliminada");
      loadNotes();
    } else {
      toast.error(result.error || "Error al eliminar nota");
    }

    setSaving(false);
    setDeleteConfirmOpen(false);
    setNoteToDelete(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-lime-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Notas Internas
        </h3>
        <span className="text-sm text-gray-500">({notes.length})</span>
      </div>

      {/* Añadir nueva nota */}
      <div className="space-y-2">
        <Textarea
          value={newNoteContent}
          onChange={(e) => setNewNoteContent(e.target.value)}
          placeholder="Escribe una nota interna sobre este mensaje..."
          className="min-h-[80px]"
          disabled={saving}
        />
        <div className="flex justify-end">
          <Button
            onClick={handleAddNote}
            disabled={saving || !newNoteContent.trim()}
            size="sm"
            className="bg-lime-600 hover:bg-lime-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Añadir Nota
          </Button>
        </div>
      </div>

      {/* Lista de notas */}
      {loading ? (
        <div className="text-center py-4 text-gray-500">Cargando notas...</div>
      ) : notes.length === 0 ? (
        <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg">
          <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No hay notas todavía</p>
          <p className="text-sm">Añade la primera nota arriba</p>
        </div>
      ) : (
        <ScrollArea className="h-[300px] rounded-lg border bg-gray-50 p-4">
          <div className="space-y-4">
            {notes.map((note) => (
              <div
                key={note.id}
                className="bg-white rounded-lg p-4 shadow-sm border"
              >
                {/* Header de la nota */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {note.users?.name || "Usuario"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {format(new Date(note.created_at), "dd/MM/yyyy HH:mm", {
                          locale: es,
                        })}
                      </span>
                    </div>
                    {note.updated_at !== note.created_at && (
                      <span className="text-xs text-gray-400">
                        (editado)
                      </span>
                    )}
                  </div>

                  {/* Botones de acción */}
                  {editingNoteId !== note.id && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStartEdit(note)}
                        disabled={saving}
                        className="h-8 w-8 p-0"
                      >
                        ✏️
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteConfirm(note.id)}
                        disabled={saving}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Contenido de la nota */}
                {editingNoteId === note.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      className="min-h-[80px]"
                      disabled={saving}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEdit}
                        disabled={saving}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(note.id)}
                        disabled={saving}
                        className="bg-lime-600 hover:bg-lime-700"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Guardar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {note.content}
                  </p>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar nota?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La nota se eliminará
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
