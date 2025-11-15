'use client';

// ============================================================
// CompanySelector Component - Redpresu
// Tabla de selección de empresas para Business Rules
// ============================================================

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Loader2, Search } from 'lucide-react';

interface Company {
  id: number;
  name: string;
  nif: string;
  type: string;
  address: string;
  locality: string;
  province: string;
  phone: string;
  email: string;
}

interface CompanySelectorProps {
  selectedCompanyId: string;
  onCompanySelect: (companyId: string) => void;
}

export function CompanySelector({ selectedCompanyId, onCompanySelect }: CompanySelectorProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/companies');

      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Error al cargar empresas');
        setCompanies([]);
      }
    } catch (error) {
      toast.error('Error al cargar empresas');
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredCompanies = companies.filter((company) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      company.name.toLowerCase().includes(searchLower) ||
      company.nif.toLowerCase().includes(searchLower) ||
      company.address.toLowerCase().includes(searchLower) ||
      company.locality.toLowerCase().includes(searchLower) ||
      company.province.toLowerCase().includes(searchLower) ||
      company.phone.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-4">
      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, NIF, dirección, localidad..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-white pl-10"
          disabled={loading}
        />
      </div>

      {/* Tabla de empresas */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-lime-600" />
          <span className="ml-3 text-sm text-muted-foreground">
            Cargando empresas...
          </span>
        </div>
      ) : companies.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No hay empresas disponibles
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No se encontraron empresas con "{search}"
        </div>
      ) : (
        <RadioGroup
          value={selectedCompanyId}
          onValueChange={onCompanySelect}
        >
          <div className="rounded-md border bg-white max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>NIF/CIF</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Teléfono</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.map((company) => (
                  <TableRow
                    key={company.id}
                    className={`cursor-pointer ${
                      selectedCompanyId === company.id.toString()
                        ? 'bg-lime-200 hover:bg-lime-200'
                        : 'bg-white hover:bg-lime-100'
                    }`}
                    onClick={() => onCompanySelect(company.id.toString())}
                  >
                    <TableCell>
                      <RadioGroupItem
                        id={`company-${company.id}`}
                        value={company.id.toString()}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <label
                        htmlFor={`company-${company.id}`}
                        className="cursor-pointer block w-full"
                      >
                        {company.name}
                      </label>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <label
                        htmlFor={`company-${company.id}`}
                        className="cursor-pointer block w-full"
                      >
                        {company.nif || '-'}
                      </label>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <label
                        htmlFor={`company-${company.id}`}
                        className="cursor-pointer block w-full"
                      >
                        {company.address ? (
                          <div className="max-w-xs truncate">
                            {company.address}
                            {company.locality && `, ${company.locality}`}
                            {company.province && ` (${company.province})`}
                          </div>
                        ) : (
                          '-'
                        )}
                      </label>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <label
                        htmlFor={`company-${company.id}`}
                        className="cursor-pointer block w-full"
                      >
                        {company.phone || '-'}
                      </label>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </RadioGroup>
      )}
    </div>
  );
}
